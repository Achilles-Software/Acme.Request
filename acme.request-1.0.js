    // Achilles Acme Mobile Remote IQueryable Storage library v1.0 Beta
    // Copyright(c) 2012 Todd Thomson, Achilles Software
    // License: MIT (http://www.opensource.org/licenses/mit-license.php)
    //
    // Tested with dependent libraries:
    //
    //  jQuery 1.7.1
    //  knockout.js 2.0
    //  knockout.mapping 2.1
    //

(function (window, $, undefined) {
 var acme = window.acme || {};
 
 function classof(o) {
 if (o === null) {
 return "null";
 }
 if (o === undefined) {
 return "undefined";
 }
 return Object.prototype.toString.call(o).slice(8, -1).toLowerCase();
 }
 
 function isArray(o) {
 return classof(o) === "array";
 }
 
 acme.request = {}
 
 acme.request.classof = classof;
 acme.request.isArray = isArray;
 
 // DataContext Class
 
 DataContext = function (dataProvider) {
 this._dataProvider = dataProvider;
 }
 
 // DataContext Methods
 
 DataContext.prototype._load = function (options, success, error) {
 var dataProvider = this._dataProvider,
 self = this,
 onSuccess = function (result) {
 // Map from JS to an observable
 // TODO: add mapping options here..
 var entities = ko.mapping.fromJS(result.entities);
 
 success.call(self, entities);
 },
 onError = function (httpStatus, errorText, context) {
 error.call(self, httpStatus, errorText, context);
 };
 
 dataProvider.get(options.providerParameters, onSuccess, onError);
 }
 
 // OfflineCapableDataSource Class..
 
 // TODO: Put the offline bits in here..
 
 OfflineCapableDataSource = function (options) {
 var mapping;
 
 if (options) {
 this._providerParameters = options.providerParameters;
 this._entityType = options.entityType;
 
 mapping = options.mapping;
 }
 
 this._entities = ko.observableArray([]);
 
 var dataProvider = new acme.request.DataProvider();
 this._dataContext = new acme.request.DataContext(dataProvider, mapping);
 
 this.getDataContext = function () {
 return this._dataContext;
 };
 
 this._completeRefresh = function (entities, success) {
 
 this._entities = ko.mapping.fromJS(entities, {}, this._entities);
 
 var newEntities = this._entities();
 
 if ($.isFunction(success)) {
 success.call(this, newEntities);
 }
 }
 
 this._failRefresh = function (httpStatus, errorText, context, fail) {
 
 if ($.isFunction(fail)) {
 fail.call(this, httpStatus, errorText, context);
 }
 }
 }
 
 // Methods..
 
 OfflineCapableDataSource.prototype.refresh = function (options, success, error) {
 var self = this,
 onSuccess = function (entities, totalCount) {
 self._completeRefresh(entities, totalCount, success);
 },
 onError = function (httpStatus, errorText, context) {
 self._failRefresh(httpStatus, errorText, context, error);
 };
 
 this._dataContext._load({
                         entityType: this._entityType,
                         providerParameters: this._providerParameters
                         }, onSuccess, onError);
 
 return this;
 }
 
 OfflineCapableDataSource.prototype.getEntities = function () {
 return this._entities;
 }
 
 // DataProvider class..
 DataProvider = function () {
 
 this.getQueryResult = function (getResult) {
 var entities, totalCount;
 
 entities = getResult;
 
 return {
 entities: acme.request.isArray(entities) ? entities : [entities],
 totalCount: totalCount
 };
 }
 
 this.normalizeUrl = function (url) {
 if (url && url.substring(url.length - 1) !== "/") {
 return url + "/";
 }
 return url;
 }
 }
 
 // Methods..
 DataProvider.prototype.get = function (parameters, success, error) {
 var operation, operationParameters;
 if (parameters) {
 operation = parameters.operationName;
 operationParameters = parameters.operationParameters;
 }
 
 if ($.isFunction(operationParameters)) {
 success = operationParameters;
 error = queryParameters;
 }
 
 var self = this;
 
 // set up the request parameters
 var url = this.normalizeUrl(parameters.url) + operation;
 var data = "";
 
 // invoke the query
 $.ajax({
        url: url,
        data: data,
        success: success && function () {
        arguments[0] = self.getQueryResult(arguments[0]);
        success.apply(self, arguments);
        },
        error: error && function (jqXHR, statusText, errorText) {
        error.call(self, jqXHR.status, self._parseErrorText(jqXHR.responseText) || errorText, jqXHR);
        },
        dataType: "json"
        });
 }
 
 DataProvider.prototype._parseErrorText = function (responseText) {
 var match = /Exception]: (.+)\r/g.exec(responseText);
 if (match && match[1]) {
 return match[1];
 }
 if (/^{.*}$/g.test(responseText)) {
 var error = JSON.parse(responseText);
 // TODO: error.Message returned by DataController
 // Does ErrorMessage check still necessary?
 if (error.ErrorMessage) {
 return error.ErrorMessage;
 } else if (error.Message) {
 return error.Message;
 }
 }
 }
 
 // Expose acme.request to the global object
 
 acme.request.DataContext = DataContext;
 acme.request.OfflineCapableDataSource = OfflineCapableDataSource;
 acme.request.DataProvider = DataProvider;
 
 if (!window.acme) {
 window.acme = acme;
 }
 })(window, jQuery);