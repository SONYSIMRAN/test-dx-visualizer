/**
 * @file DocumentationController.cls
 * @description Controller class for handling documentation-related actions in Salesforce.
 * This includes fetching categories, searching for documents based on a query,
 * and retrieving related files for each document.
 *
 * @author [Your Name]
 * @date [Today's Date]
 */
public with sharing class DXDocumentationController {

    /**
     * @description Fetches the list of available categories from the `Documentation__c` object's `Category__c` picklist field.
     * @return List<String> A list of category names from the `Category__c` picklist field.
     * @example List<String> categories = DocumentationController.getCategoryOptions();
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getCategoryOptions() {
        if (!Schema.sObjectType.Documentation__c.isAccessible()) {
            throw new AuraHandledException('No read permission for Documentation.');
        }

        List<String> categoryOptions = new List<String>();
        for (Schema.PicklistEntry entry : Documentation__c.Category__c.getDescribe().getPicklistValues()) {
            categoryOptions.add(entry.getLabel());
        }
        return categoryOptions;
    }

    /**
     * @description Fetches documents grouped by category based on a search query.
     * The search query filters documents by name or topic, and the results are grouped by category.
     *
     * @param searchQuery The term to search for in document names and topics.
     * @return Map<String, List<DocumentationWrapper>> A map of documents grouped by category.
     * @example Map<String, List<DocumentationWrapper>> docs = DocumentationController.getDocumentsBySearch('Salesforce');
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, List<DocumentationWrapper>> getDocumentsBySearch(String searchQuery) {
        if (!Schema.sObjectType.Documentation__c.isAccessible()) {
            throw new AuraHandledException('No read permission for Documentation.');
        }

        List<Documentation__c> docs = fetchDocuments(searchQuery);
        Map<Id, List<FileWrapper>> filesMap = fetchRelatedFiles(docs);
        return groupDocumentsByCategory(docs, filesMap);
    }

    /**
    * Fetches documents that match the search query.
    * @description This method queries the Documentation__c objects where the Name or Topic__c fields contain the provided searchQuery string.
    * @param searchQuery The string to search for within the Name and Topic__c fields of Documentation__c records.
    * @return A list of Documentation__c records that match the search query.
    */
    private static List<Documentation__c> fetchDocuments(String searchQuery) {
        return [
            SELECT Id, Name, Category__c, Topic__c, Owner.Email, Owner.Name, CreatedDate 
            FROM Documentation__c
            WHERE Name LIKE :('%' + searchQuery + '%') 
            OR Topic__c LIKE :('%' + searchQuery + '%')
        ];
    }

    /**
    * Fetches related files for the provided documentation records.
    * @description This method retrieves a map of related files for each `Documentation__c` record in the provided list. It returns a map where the key is the documentation record ID, and the value is a list of `FileWrapper` objects representing the related files.
    * @param docs A list of `Documentation__c` records for which related files need to be fetched.
    * @return A map where the key is the documentation record ID, and the value is a list of `FileWrapper` objects representing the related files.
    */
    private static Map<Id, List<FileWrapper>> fetchRelatedFiles(List<Documentation__c> docs) {
        Map<Id, List<FileWrapper>> filesMap = new Map<Id, List<FileWrapper>>();

        if (docs.isEmpty() || !Schema.sObjectType.ContentDocumentLink.isAccessible()) {
            return filesMap;
        }

        Set<Id> docIds = new Set<Id>();
        for (Documentation__c doc : docs) {
            docIds.add(doc.Id);
        }

        List<ContentDocumentLink> files = [
            SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.LatestPublishedVersionId, LinkedEntityId
            FROM ContentDocumentLink 
            WHERE LinkedEntityId IN :docIds
        ];

        for (ContentDocumentLink file : files) {
            if (!filesMap.containsKey(file.LinkedEntityId)) {
                filesMap.put(file.LinkedEntityId, new List<FileWrapper>());
            }
            filesMap.get(file.LinkedEntityId).add(
                new FileWrapper(file.ContentDocumentId, file.ContentDocument.Title, file.ContentDocument.LatestPublishedVersionId)
            );
        }

        return filesMap;
    }
    /**
    * Groups the provided documentation records by category, including their related files.
    * @description This method groups the provided `Documentation__c` records by their `Category__c` field. It also associates the related files from the `filesMap` with each documentation record. The method returns a map where the key is the category name, and the value is a list of `DocumentationWrapper` objects.
    * @param docs A list of `Documentation__c` records to be grouped by category.
    * @param filesMap A map of related files, where the key is the documentation record ID, and the value is a list of `FileWrapper` objects for that documentation.
    * @return A map where the key is the category name (`String`), and the value is a list of `DocumentationWrapper` objects, each representing a documentation record and its related files.
    */
    private static Map<String, List<DocumentationWrapper>> groupDocumentsByCategory(List<Documentation__c> docs, Map<Id, List<FileWrapper>> filesMap) {
        Map<String, List<DocumentationWrapper>> documentResultsByCategory = new Map<String, List<DocumentationWrapper>>();

        for (Documentation__c doc : docs) {
            List<FileWrapper> fileWrappers = filesMap.containsKey(doc.Id) ? filesMap.get(doc.Id) : new List<FileWrapper>();
            DocumentationWrapper docWrapper = new DocumentationWrapper(doc, fileWrappers);

            if (!documentResultsByCategory.containsKey(doc.Category__c)) {
                documentResultsByCategory.put(doc.Category__c, new List<DocumentationWrapper>());
            }
            documentResultsByCategory.get(doc.Category__c).add(docWrapper);
        }

        return documentResultsByCategory;
    }

    /**
    * Fetches the content of a document in base64 format.
    * @description This method retrieves the content of a specific version of a document identified by the `contentDocumentId` and `versionId` in base64-encoded format.
    * @param contentDocumentId The ID of the `ContentDocument` to fetch the content for.
    * @param versionId The ID of the specific version of the `ContentDocument` to retrieve.
    * @return A base64-encoded string representing the document's content.
    */
    @AuraEnabled(cacheable=true)
    public static String getDocumentContentBase64(String contentDocumentId, String versionId) {
        try {
            if (!Schema.sObjectType.ContentVersion.isAccessible()) {
                throw new AuraHandledException('No read permission for ContentVersion.');
            }

            ContentVersion contentVersion = [
                SELECT VersionData 
                FROM ContentVersion 
                WHERE ContentDocumentId = :contentDocumentId 
                AND Id = :versionId
                LIMIT 1
            ];

            return EncodingUtil.base64Encode(contentVersion.VersionData);
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching document content: ' + e.getMessage());
        }
    }

    /**
    * Retrieves the URL for downloading the specified version of a document.
    * @description This method generates a download URL for a specific version of a document identified by its `contentVersionId`.
    * @param contentVersionId The ID of the `ContentVersion` record for which the download URL is to be generated.
    * @return A string containing the full URL to download the specified version of the document.
    */
    @AuraEnabled(cacheable=true)
    public static String getDocumentUrl(String contentVersionId) {
        if (!Schema.sObjectType.ContentVersion.isAccessible()) {
            throw new AuraHandledException('No read permission for ContentVersion.');
        }

        ContentVersion contentVersion = [SELECT Id FROM ContentVersion WHERE Id = :contentVersionId LIMIT 1];

        return URL.getOrgDomainUrl().toExternalForm() + '/sfc/servlet.shepherd/version/download/' + contentVersion.Id;
    }

    /**
    * Represents a wrapper for the `Documentation__c` object, including its associated files.
    * @description This class wraps a `Documentation__c` record and its related files (`FileWrapper`) in a single object.
    * @param doc The `Documentation__c` record to be wrapped.
    * @param files A list of `FileWrapper` objects representing the files associated with the documentation.
    */
    public class DocumentationWrapper {
        @AuraEnabled public Documentation__c doc;
        @AuraEnabled public List<FileWrapper> files;
        /**
        * Constructor for creating a `DocumentationWrapper` instance.
        * @description Initializes a new `DocumentationWrapper` with a `Documentation__c` record and its related files.
        * @param doc The `Documentation__c` record to be wrapped.
        * @param files A list of `FileWrapper` objects representing the files associated with the documentation.
        */
        public DocumentationWrapper(Documentation__c doc, List<FileWrapper> files) {
            this.doc = doc;
            this.files = files;
        }
    }

    /**
    * Represents a wrapper for file details related to a `ContentDocument`.
    * @description This class holds the details of a file associated with a `ContentDocument`, including its ID, title, and version ID.
    * @param contentDocumentId The ID of the `ContentDocument` associated with the file.
    * @param title The title of the `ContentDocument`.
    * @param contentVersionId The ID of the specific version of the `ContentDocument` associated with the file.
    */
    public class FileWrapper {
        @AuraEnabled public String contentDocumentId;
        @AuraEnabled public String title;
        @AuraEnabled public String contentVersionId;
/**
    * Represents a wrapper for file details related to a `FileWrapper`.
    * @description This class holds the details of a file associated with a `ContentDocument`, including its ID, title, and version ID.
    * @param contentDocumentId The ID of the `ContentDocument` associated with the file.
    * @param title The title of the `ContentDocument`.
    * @param contentVersionId The ID of the specific version of the `ContentDocument` associated with the file.
    */
        public FileWrapper(String contentDocumentId, String title, String contentVersionId) {
            this.contentDocumentId = contentDocumentId;
            this.title = title;
            this.contentVersionId = contentVersionId;
        }
    }
}