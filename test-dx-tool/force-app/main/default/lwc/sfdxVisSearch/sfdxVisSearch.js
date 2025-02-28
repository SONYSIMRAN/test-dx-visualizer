// import { LightningElement } from 'lwc';

// export default class SfdxVisSearch extends LightningElement {}

import { LightningElement, track } from 'lwc';
import images from '@salesforce/resourceUrl/visualizer_images';
import apiServiceTypeArray from '@salesforce/apex/DXApiService.apiServiceTypeArray';
import apiServiceTypeArrayObj from '@salesforce/apex/DXApiService.apiServiceTypeArrayObj';
import { serializeParams } from 'c/dxUtils';


export default class SfdxVisSearch extends LightningElement {
    //Views Config
    searchView = true;
    //Header Config
    cardView = false;
    kanbanView = false;
    listView = false;
    buttonPackageDep = false;
    buttonSandboxCodeSize = false;
    buttonPackageSorting = false;
    selectSandbox = false;
    //Header Config
    iconTilesView = images + '/images/tiles-view-icon.svg';
    iconKanbanView = images + '/images/kanban-view-icon.svg';
    iconListView = images + '/images/list-view-icon.svg';
    iconPackageDepView = images + '/images/graph-action-icon.svg';
    iconCodeSizeView = images + '/images/code-size-icon.svg';
    iconSortView = images + '/images/sorting-action-icon.svg';
    @track result;
    @track resultCount = null;
    //Combobox params
    @track metaDataValue = null;
    @track metaData;
    isLoading = true;
    //Search query term
    searchLoader = false;
    searchKeywords = false;
    searchResults = false;
    queryTerm;

    connectedCallback() {
        this.fetchMetaData();
    }
    //Get Kanban API data
    fetchMetaData() {
        this.isLoading = true;
        apiServiceTypeArray({
            request: 'GET',
            apiName: 'getmetadatatypes',
            apiParams: serializeParams({
                sandbox: sessionStorage.getItem("selectedSandbox")
            })
        }).then(response => {
            if (response) {
                this.metaData = response.map(el => { return { label: el.replace(/([A-Z])/g, ' $1').trim(), value: el } });
            }
            console.log("response", sessionStorage.getItem("selectedSandbox"), JSON.parse(JSON.stringify(response)));
            this.isLoading = false;
        }).catch(error => {
            console.error(error);
            this.isLoading = false;
        })
    }

    //Get Search API data
    fetchSearchResults() {
        this.searchLoader = true;
        const inputString = this.queryTerm.trim().split(" ").join("|");
        const searchQuery = `${this.metaDataValue}|${inputString}`;
        console.log('Search query', searchQuery);
        apiServiceTypeArrayObj({
            request: 'GET',
            apiName: 'searchmetadata',
            apiParams: serializeParams({
                query: searchQuery
            })
        }).then(response => {
            this.result = response;
            this.resultCount = response?.length || '0';
            console.log("search results", JSON.parse(JSON.stringify(response)));
            this.searchLoader = false;
        }).catch(error => {
            console.error(error);
            this.searchLoader = false;
        })
    }
    //Handle metadata change
    handleMetadataChange(event) {
        this.metaDataValue = event.detail.value;
    }
    handleSearchKeyUp(evt) {
        const isEnterKey = evt.keyCode === 13;
        if (isEnterKey && (evt.target.value).length > 2) {
            this.queryTerm = evt.target.value;
            if (!this.queryTerm || !this.queryTerm.trim()) {
                this.searchKeywords = true;
            }
            if (this.metaDataValue && this.queryTerm && this.queryTerm.trim()) {
                this.searchKeywords = false;
                //Call search API
                this.fetchSearchResults();
                this.searchResults = true;
            }
            else {
                this.searchResults = false;
                this.searchKeywords = true;
                console.log('No keywords to search');
            }
        }
    }
}