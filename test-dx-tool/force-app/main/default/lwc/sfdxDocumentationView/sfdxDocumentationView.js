import { LightningElement, track, api } from 'lwc';
import getCategoryOptions from '@salesforce/apex/DXDocumentationController.getCategoryOptions';
import getDocumentsBySearch from '@salesforce/apex/DXDocumentationController.getDocumentsBySearch';
import getDocumentUrl from '@salesforce/apex/DXDocumentationController.getDocumentUrl';
import { NavigationMixin } from 'lightning/navigation';

export default class SfdxDocumentationView extends NavigationMixin(LightningElement) {
    @track searchTerm = '';
    @track activeTab = '';
    @track tabs = [];
    @track filteredContent = [];
    @track isLoading = false;
    @api contentDocumentId;
    @api contentVersionId;
    allDocumentsByCategory = {};
    headerConfig = true;
    //Header Config
    cardView = true;
    kanbanView = true;
    listView = true;
    buttonPackageDep = true;
    buttonSandboxCodeSize = true;
    buttonPackageSorting = false;
    buttonMetricsDashboard = true;
    envStatusDashboard = false;

    selectSandbox = false;
    isLoading = false;

    connectedCallback() {
        this.loadCategories();
        this.fetchAllDocuments(); // Load all documents initially
    }

    loadCategories() {
        this.isLoading = true;
        getCategoryOptions()
            .then((categories) => {
                this.tabs = categories.map((category) => ({
                    label: category,
                    count: 0,
                    class: ''
                }));
                this.activeTab = this.tabs[0]?.label;
                this.updateTabClasses();
                this.isLoading = false;
            })
            .catch((error) => {
                console.error('Error fetching categories:', error);
                this.isLoading = false;
            });
    }

    fetchAllDocuments() {
        this.isLoading = true;
        getDocumentsBySearch({ searchQuery: '' })  // Fetch all documents without search filter
            .then((results) => {
                this.allDocumentsByCategory = results;

                // Populate tabs with document counts based on all categories
                this.tabs = this.tabs.map((tab) => {
                    const categoryDocs = results[tab.label] || [];
                    return {
                        ...tab,
                        count: categoryDocs.length
                    };
                });

                this.updateTabClasses();
                this.filteredContent = this.getDocumentsForActiveTab(); // Show all documents in the active tab
                this.isLoading = false;
            })
            .catch((error) => {
                console.error('Error fetching documents:', error);
                this.isLoading = false;
            });
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;

        // Fetch documents when search term changes
        this.fetchDocumentsForAllCategories();
    }
    

    handleTabClick(event) {
        this.isLoading = true;  // Start loader when tab is clicked
        this.activeTab = event.currentTarget.dataset.label;
        this.updateTabClasses();
        this.filteredContent = this.getDocumentsForActiveTab();  // Show documents for the selected tab
        this.isLoading = false;  // End loader once content is updated
    }

    getDocumentsForActiveTab() {
        const activeCategoryDocs = this.allDocumentsByCategory[this.activeTab] || [];
        let documents = [];

        if (activeCategoryDocs.length > 0) {
            // Process documents once fetched
            activeCategoryDocs.forEach((docWrapper) => {
                docWrapper.files.forEach((file) => {
                    documents.push({
                        id: docWrapper.doc.Id,
                        documentPath: docWrapper.doc.Topic__c,
                        linkText: docWrapper.doc.Name,
                        userEmail: docWrapper.doc.Owner.Email,
                        userName: docWrapper.doc.Owner.Name,
                        createdDateTime: docWrapper.doc.CreatedDate,
                        ContentDocumentId: file.contentDocumentId,
                        ContentVersionId: file.contentVersionId
                    });
                });
            });
        }
        return documents;
    }

    updateDocumentCount() {
        // Calculate the count based on filteredContent for the active tab
        let activeTabContent = this.filteredContent.filter(doc => doc.tab === this.activeTab);
        this.documentCount = activeTabContent.length;
    }

    fetchDocumentsForAllCategories() {
        this.isLoading = true;
        getDocumentsBySearch({ searchQuery: this.searchTerm })
            .then((results) => {
                this.allDocumentsByCategory = results;
    
                // Update tab counts based on search results (keeping all tabs)
                this.tabs = this.tabs.map((tab) => {
                    const categoryDocs = results[tab.label] || [];
                    return {
                        ...tab,
                        count: categoryDocs.length // Update count based on search results
                    };
                });
    
                // Set active tab to the first available one (or keep the current tab if it still exists)
                if (!this.tabs.find((tab) => tab.label === this.activeTab)) {
                    this.activeTab = this.tabs[0]?.label || ''; // Default to first tab or empty if none exist
                }
    
                this.updateTabClasses();
                this.filteredContent = this.getDocumentsForActiveTab(); // Update displayed documents
                this.isLoading = false;
            })
            .catch((error) => {
                console.error('Error fetching documents:', error);
                this.isLoading = false;
            });
    }


    // Highlight tabs with count > 0 and apply bold font only for those tabs
    updateTabClasses() {
        this.tabs = this.tabs.map((tab) => ({
            ...tab,
            class: tab.count > 0 ? 'tab highlight' : 'tab'
        }));
    }

    handlePreview(event) {
        const contentVersionId = event.target.dataset.version;  
        console.log('contentVersionId: ', contentVersionId);

        if (contentVersionId) {
            getDocumentUrl({ contentVersionId: contentVersionId })
                .then(url => {
                    if (url) {
                        window.open(url, '_blank');
                    } else {
                        console.error('No URL returned for this document.');
                    }
                })
                .catch(error => {
                    console.error('Error fetching document URL: ', error);
                });
        } else {
            console.error('ContentVersionId is missing');
        }
    }
    
    handleDownload(event) {
        const contentVersionId = event.target.dataset.link;  
        console.log('Download document link:', contentVersionId);
        if (contentVersionId) {
            const downloadUrl = `/sfc/servlet.shepherd/version/download/${contentVersionId}`;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = downloadUrl.substring(downloadUrl.lastIndexOf('/') + 1); 
            a.click();
        } else {
            console.error('ContentVersionId is missing or invalid for download.');
        }
    }

     // Function to refresh categories and documents
     resetSearch() {
        this.isLoading = true;
        this.searchTerm = '';  

        // Reload categories and documents
        this.loadCategories();
        this.fetchAllDocuments();

        // Simulate loading time, then hide spinner
        setTimeout(() => {
            this.isLoading = false;
        }, 1000); // Adjust as needed
    }

}