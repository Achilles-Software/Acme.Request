// Achilles Acme Mobile Remote IQueryable Storage library v1.0 Beta
// Copyright(c) 2012 Todd Thomson, Achilles Software
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
//
// Tested with dependent libraries:
//
//  Modernizr.js 2.5.3
//  jQuery.js 1.7.1
//  knockout.js 2.0
//  knockout.mapping.js 2.1
//  Amplify.store.js 1.0
//

(function (window, $, undefined) {
    var acme = window.acme || {};

    function hasLocalStorage() {
        return Modernizr.localstorage;
    }

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

    acme.request.hasLocalStorage = hasLocalStorage;
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

    // FUTURE: Autorefresh feature

    OfflineCapableDataSource = function (options) {
        var self = this;

        var mapping;

        if (options) {
            this._providerParameters = options.providerParameters;
            this._entityType = options.entityType;

            mapping = options.mapping;
        }

        this._entities = ko.observableArray([]);

        var dataProvider = new acme.request.DataProvider();
        this._dataContext = new acme.request.DataContext(dataProvider, mapping);
        this._hasLocalStorage = acme.request.hasLocalStorage();
        this._needsSync = false;
        this._onLine = navigator.onLine;

        // Register a listener for online offline events..
        $(window).bind("online offline", function (event) {
            self._onLine = navigator.onLine;

            if (self._needsSync && self_onLine) {
                self.refresh();
            }
        });

        this.getDataContext = function () {
            return this._dataContext;
        };

        this._completeRefresh = function (entities, success) {

            // Save the server entities to local storage..
            if (this._hasLocalStorage) {
                amplify.store.localStorage(this._entityType, ko.mapping.toJS(entities));
            }

            this._entities = ko.mapping.fromJS(entities, {}, this._entities);

            this._needsSync = false;

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
        var storedEntities;

        // first, try to obtain entities from local storage..
        if (this._hasLocalStorage) {
            storedEntities = amplify.store.localStorage(this._entityType);

            // Did we previously store the server entities?
            if (storedEntities !== undefined)
                this._entities = ko.mapping.fromJS(storedEntities, {}, this._entities);
        }

        if (!this._onLine) {
            this._needsSync = true;
            return this;
        }

        var self = this,
            onSuccess = function (entities) {
                self._completeRefresh(entities, success);
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
            var entities;

            entities = getResult;

            return {
                entities: acme.request.isArray(entities) ? entities : [entities]
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