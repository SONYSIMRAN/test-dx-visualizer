public class CSVToCustomMetadata {
    public static void insertCustomMetadataFromCSV() {
        try {
            // Retrieve the Static Resource (CSV file)
            StaticResource csvResource = [SELECT Id, Name, Body FROM StaticResource WHERE Name = 'unmanaged_package' LIMIT 1];
            String csvData = csvResource.Body.toString();
            
            // Debug: Log the raw CSV data to ensure it's being fetched
            System.debug('CSV Data: ' + csvData);
            
            // Split the CSV data into lines
            List<String> lines = csvData.split('\n');
            System.debug('lines size are' + lines.size());
            //sys
            List<Metadata.CustomMetadata> metadataRecords = new List<Metadata.CustomMetadata>();

            // Skip the header row (assuming the first row is the header)
            for (Integer i = 1; i < lines.size(); i++) {
                String line = lines[i].trim();
                
                // Skip empty lines
                if (String.isEmpty(line)) {
                    continue;
                }

                // Split the line by comma to get the columns
                List<String> columns = line.split(',');

                // Debug: Log each line to check how it's being split
                System.debug('Processing line: ' + line);
                System.debug('Columns: ' + columns);

                // Ensure there are enough columns to avoid errors
                if (columns.size() >= 8) {
                    // Create a Custom Metadata record
                    Metadata.CustomMetadata cm = new Metadata.CustomMetadata();
                    cm.fullName = 'Unmanaged_Package__mdt.' + columns[0].trim();
                    cm.label = columns[7].trim();

                    // Debug: Log the full name and label to check their values
                    System.debug('FullName: ' + cm.fullName);
                    System.debug('Label: ' + cm.label);
                    
                    // Adding custom fields to the custom metadata record
                    cm.values = new List<Metadata.CustomMetadataValue>();

                    Metadata.CustomMetadataValue customField1 = new Metadata.CustomMetadataValue();
                    customField1.field = 'Component_Name__c';
                    customField1.value = columns[0].trim();
                    cm.values.add(customField1);

                    Metadata.CustomMetadataValue customField2 = new Metadata.CustomMetadataValue();
                    customField2.field = 'Component_Type__c';
                    customField2.value = columns[1].trim();
                    cm.values.add(customField2);

                    Metadata.CustomMetadataValue customField3 = new Metadata.CustomMetadataValue();
                    customField3.field = 'Package_Name__c';
                    customField3.value = columns[2].trim();
                    cm.values.add(customField3);

                    Metadata.CustomMetadataValue customField4 = new Metadata.CustomMetadataValue();
                    customField4.field = 'Description__c';
                    customField4.value = columns[3].trim();
                    cm.values.add(customField4);
                 System.debug('cm is: ' + cm);
                    // Add this record to the list
                    metadataRecords.add(cm);
                } else {
                    System.debug('Skipping line due to insufficient columns: ' + line);
                }
            }

            // Debug: Log the number of records to be inserted
            System.debug('Total Records to insert: ' + metadataRecords.size());

            // If records exist, initiate the metadata deployment
            if (!metadataRecords.isEmpty()) {
                Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();

                // Add metadata records one by one
                for (Metadata.CustomMetadata cm : metadataRecords) {
                    mdContainer.addMetadata(cm);
                }

                // Enqueue deployment job
                Id jobId = Metadata.Operations.enqueueDeployment(mdContainer, null);
                System.debug('Deployment Job ID: ' + jobId);
            } else {
                System.debug('No valid records to insert.');
            }
        } catch (Exception e) {
            // Catch any errors and log them
            System.debug('Error during CSV processing: ' + e.getMessage());
        }
    }
}