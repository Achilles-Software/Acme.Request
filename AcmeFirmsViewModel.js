function AcmeFirmsViewModel() {
    // Data
    var self = this;
    
    self.dataSource = acme.request.dataSources.firms.refresh();

    self.firms = self.dataSource.getEntities();
}