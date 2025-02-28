import { LightningElement, api, track, wire } from 'lwc';
import { formatData } from 'c/dxUtils';
import { CurrentPageReference } from 'lightning/navigation';
// import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
// import SheetJS from '@salesforce/resourceUrl/SheetJS';

export default class SfdxVisQualityGatesView extends LightningElement {
  //Header Config
  cardView = true;
  kanbanView = true;
  listView = true;
  buttonPackageDep = false;
  buttonSandboxCodeSize = false;
  buttonPackageSorting = false;
  selectSandbox = false;
  combobox360View = false;
  comboboxEnvGatesView = false;
  viewQualityGatesEnvNames = [];
  //Header config end
  result;
  isLoading = true;
  filtereEnvData;
  sandboxName = 'LOAD';
  @track formattedData = [];
  @api envGateData = [];

  @track sortColumn = '';
  @track sortDirection = 'asc';
  @track selectedStatus = '';
  @track selectedEnabled = '';
  @track currentColumn ;

  
  
  //Get state event
  @wire(CurrentPageReference)
  getStateParameters(currentPageReference) {
    if (currentPageReference) {
      console.log('Page ref', currentPageReference);
      this.envGateData = currentPageReference.attributes.attributes?.envGatesData;
      this.sandboxName = currentPageReference.attributes.attributes?.sandbox;
      this.setResultValues(this.envGateData);
      console.log('envGateData', JSON.parse(JSON.stringify(this.envGateData)));
    }
  }

  setSandboxList(names) {
    console.log('names', names);
    this.viewQualityGatesEnvNames = [];

    names && names.forEach(el => {
      if (el && el.Name && !this.viewQualityGatesEnvNames.includes(el.Name)) {
        this.viewQualityGatesEnvNames.push(el.Name);
      }
    });
    this.comboboxEnvGatesView = true;
  }

  getSandbox(event) {
    this.sandboxName = event.detail.sandbox;
    console.log('Header params in QGS', event.detail.sandbox, this.result);
    this.filtereEnvData = this.result.filter(env => env.Name === this.sandboxName);
    this.retrieveEnvGateData(this.filtereEnvData);
  }

  setResultValues(envGateData) {
    if (!envGateData || envGateData.length === 0) {
      this.isLoading = false;
      return [];
    }
    this.isLoading = true;
    this.setSandboxList(envGateData);
    this.result = formatData(envGateData);
    // console.log(' this.result',  this.result);
    this.filtereEnvData = this.result.filter(env => env.Name === this.sandboxName);
    this.retrieveEnvGateData(this.filtereEnvData);
  }

  retrieveEnvGateData(filtereEnvData) {
    this.isLoading = true;
    console.log('filtereEnvData', filtereEnvData);
    const formattedData = filtereEnvData.map(env => {
      const formattedEnv = {
        name: env.Name,
        packages: env.Releases.flatMap(release =>
          release.Packages.map(pkg => ({
            sandbox: pkg.sandbox,
            name: pkg.packageName,
            latestDeployedVersion: pkg.status?.LatestDeployedVersion || 'N/A',
            zttResults: pkg.status?.ZTTResults || 'N/A',
            zttStatus: pkg.status?.ZTTStatus || 'N/A',
            pdtResults: pkg.status?.PDTResults || 'N/A',
            pdtStatus: pkg.status?.PDTStatus || 'N/A',
            testExecutionTimeStatus: pkg.status?.TestExecutionTimeStatus || 'N/A',
            packageDeployTime: pkg.status?.PackageDeployTime || 'N/A',
            release: pkg.release,
            enabledZTT: this.getEnabledValue(pkg.status, 'automation_ztt'),
            enabledPDT: this.getEnabledValue(pkg.status, 'automation_pdt'),
            riskScore: this.getRiskScore(pkg.riskScore) || 'N/A',
          }))
        ),
      };
      // console.log('formattedEnv', formattedEnv);
      return formattedEnv;
    });

    this.isLoading = false;
    this.formattedData = formattedData;
    console.log('formattedData', JSON.parse(JSON.stringify(this.formattedData)));
    return formattedData;
  }

  getEnabledValue(status, type) {
    if (status && status.enabledValue) {
      const enabledObj = status.enabledValue.find(item => item.name === type);
      return enabledObj?.enabled;
    }
  }

  getRiskScore(riskScoreArray) {
    const summaryRiskObj = riskScoreArray?.find(item => item.quality_type === 'summary_risk');
    return summaryRiskObj ? { score: summaryRiskObj.result || 'N/A', profile: summaryRiskObj.profile || 'N/A' } : { score: 'N/A', profile: 'N/A' };
  }

  get sortDirectionIcon() {
    return this.sortDirection === 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
  }

  handleSort(event) {
    const column = event.currentTarget.dataset.column;
     console.log('Sorting Column:', column);

    if (column === this.sortColumn) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.sortData();
  }
  hideSortIcon = false;
  selectedNavHandler(event) {
    this.hideSortIcon = event.detail;
  }

  resetSorting() {
    this.sortDirection = 'asc';
    this.hideSortIcon = false;
  }

  handleStatusFilterChange(event) {
    const column  = event.detail.column;
    const selectedStatus = event.detail.status;
    // console.log('Selected Status:', selectedStatus);
    // console.log('Selected column:', column);

    this.selectedStatus = selectedStatus;
    this.sortColumn = column;
    this.sortData();
    this.resetSorting();
  }



  handleEnabledFilterChange(event) {
    const column  = event.detail.column;
    const selectedEnabled = event.detail.enabled;
    // console.log('Selected Enabled:', selectedEnabled);
    // console.log('Selected column:', column);

    this.selectedEnabled = selectedEnabled;
    this.sortColumn = column;
    this.sortData();
    this.resetSorting();
  }
  

  sortData() {
    const { sortColumn, sortDirection, selectedStatus, selectedEnabled } = this;
    console.log('sortColumn=>', sortColumn, selectedStatus.toUpperCase(), selectedEnabled);
    this.selectedStatus = selectedStatus;
    this.selectedEnabled = selectedEnabled;
    let filteredData = [];

    // Copy the original data to the filteredData array
    filteredData = this.retrieveEnvGateData(this.filtereEnvData);
    console.log('filteredData=>', filteredData);

    // Filter data based on status and enabled columns
    if ((sortColumn === 'zttStatus' || sortColumn === 'pdtStatus') && (selectedStatus === 'Pass' || selectedStatus === 'Fail')) {
      filteredData.forEach(env => {
        env.packages = env.packages.filter(pkg => pkg && pkg[sortColumn] === selectedStatus.toUpperCase());
      });
    } else if ((sortColumn === 'enabledZTT' || sortColumn === 'enabledPDT') && (selectedEnabled === 'On' || selectedEnabled === 'Off')) {
      const enabledValue = selectedEnabled === 'On' ? 1 : 0;
      console.log('Enabled Value:', enabledValue);
      filteredData.forEach(env => {
        env.packages = env.packages.filter(pkg => {
          return pkg && pkg[sortColumn] === enabledValue;
        });
    });
    } else {
      filteredData.forEach(env => {
        env.packages.sort((a, b) => {
          let valueA, valueB;

          // Handle sorting for columns other than status and enabled
          if (sortColumn === 'name') {
            valueA = a.name.toLowerCase();
            valueB = b.name.toLowerCase();
          } else if (sortColumn === 'zttResults' || sortColumn === 'pdtResults') {
            valueA = a[sortColumn] === 'N/A' ? -Infinity : parseFloat(a[sortColumn]);
            valueB = b[sortColumn] === 'N/A' ? -Infinity : parseFloat(b[sortColumn]);
          } else if (sortColumn === 'riskScore') {
            valueA = a[sortColumn].score === 'N/A' ? -Infinity : parseFloat(a[sortColumn].score);
            valueB = b[sortColumn].score === 'N/A' ? -Infinity : parseFloat(b[sortColumn].score);
          } else if (sortColumn === 'release') {
            valueA = new Date(a.release).getTime();
            valueB = new Date(b.release).getTime();
          }

          if (valueA > valueB) {
            return sortDirection === 'asc' ? 1 : -1;
          }
          if (valueA < valueB) {
            return sortDirection === 'asc' ? -1 : 1;
          }
          return 0;
        });
      });
    }
    
    this.formattedData = filteredData;
  }


}