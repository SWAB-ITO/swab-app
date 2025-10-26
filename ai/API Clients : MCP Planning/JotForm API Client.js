/**
 * JotForm.js 0.1.0
 *
 *  (c) 2013 JotForm Easiest Form Builder
 *
 * JotForm.js may be freely distributed under the MIT license.
 * For all details and documentation:
 * http://api.jotform.com
 */

/*
 * INITIAL SETUP
 * =============
 *
 * Include JotForm.js script to your page
 *
 * __<script src="//js.jotform.com/JotForm.js"></script>__
 *
 * Initialize SDK
 *
 *      JF.initialize({ apiKey: YOUR_API_KEY })
 *
 * In case of you are using SDK in a 3rd pary app
 *
 *      JF.initialize({ appName: YOUR_APP_NAME })
 *
 */

/*global _readCookie, _createCookie, root, _getWindowDimensions, removeElement, _createCORSRequest, console*/
var JF = (function(base) {

    var _apiKey = null,
        _appName,
        _baseURL = '//www.jotform.com',
        _requestURL = '//api.jotform.com',
        _requestURLEU = '//eu-api.jotform.com',
        _requestURLHIPAA = '//hipaa-api.jotform.com',
        _authPath = '/api/oauth.php',
        _loginWindowURL = 'https://www.jotform.com' + _authPath,
        _accessType = 'readOnly',
        _authType = 'login',
        _autocomplete = false,
        _enableCookie = false,
        _oauthFrameWidth = 450,
        _oauthFrameHeight = 450
        root = {};

    var _config = function (options) {

        if(typeof options !== 'object') {
            return
        }
        /**
         * if set true JF will remember user on next visit
         * will set jf_auth cookie
         */
        if (options.enableCookieAuth) {
            _enableCookie = options.enableCookieAuth;
            if(_enableCookie) {
                _apiKey = _readCookie("jf_auth");
            }
            root.login = _login;
        }
        /**
         * if set API requests will be transported to this URL
         * useful for working on development environment
         */
        if(options.requestUrl !== undefined) {
            _requestURL = options.requestUrl;
        }
        /**
         * if set login request will be transported to this URL
         */
        if(options.baseUrl !== undefined) {
            _baseURL = options.baseUrl;
            _loginWindowURL = _baseURL + _authPath;
        }
        if(options.authPath !== undefined) {
            _authPath = options.authPath;
            _loginWindowURL = _baseURL + _authPath;
        }
        /*
         *  application access type parameter shuld be given on initialize
         *  if not given defult is readOnly
         */
        if ( options.accessType === 'readOnly' ||  options.accessType === 'full' ) {
            _accessType = options.accessType;
        }
        /**
         * if set, autocomplete will initiate for username and email only
         * if not given, no autocomplete will set
         */
        if ( options.autocomplete !== undefined && typeof options.autocomplete === 'object' ) {
            _autocomplete = JSON.stringify(options.autocomplete);
        }

        /**
         * application authType will show the login or signup modal if user is not logged in
         * if not given default is login
         */
        if ( options.authType !== undefined ) {
            _authType = options.authType;
        }

        /**
         * application name for 3rd party applications
         */
        if (typeof options.appName === 'string') {
            _appName = options.appName;
        }

        // if(_enableCookie) {

        // }
        /*
         * initialize SDK with API Key
         *
         *     default: undefined
         *
         * Note that you can't call any method without a valid API Key
         */
        if (typeof options.apiKey === 'string') {
            _apiKey = options.apiKey;
            //keep API key as cookie for later use
            if(true) {
                if(_enableCookie) {
                    _createCookie("jf_auth", _apiKey);
                }
            }
        }

        if(typeof options.oauthFrameWidth === 'number') {
            _oauthFrameWidth = options.oauthFrameWidth;
        }

        if(typeof options.oauthFrameHeight === 'number') {
            _oauthFrameHeight = options.oauthFrameHeight;
        }
    }
    /**
     * SDK can be initialized with apiKey and appName parameters
     */
    root.initialize = function(options) {

        if (options === undefined) {
            return;
        }
        _config(options);
    };

    root.init = function(options) {
        root.initialize(options);
    };

    root.login = _login;
    /*
     * returns _apiKey
     *
     * returns null if user is not logged in
     */
    root.getAPIKey = function() {
        return _apiKey;
    };


    root.logout = function() {
        _eraseCookie("jf_auth");
    };

    /**
     * use the api endpoint for EU(eu-api.jotform.com)
     */
    root.useEU = function() {
        _requestURL = _requestURLEU;
    };

    /**
     * use the api endpoint for HIPAA(hipaa-api.jotform.com)
     */
    root.useHIPAA = function() {
        _requestURL = _requestURLHIPAA;
    }

    /**
     * for all functions successful result will be passed into next (callback) function given as argumen
     */

//-------------------USER----------------------------------------

    /**
     * __POST http://api.jotform.com/user/register__
     * -----------------------------------
     */
    root.register = function(user, callback, errback) {
        if (typeof user !== 'object') {
            console.error("User (first argument) should be object");
            return;
        }

        user = preparePOST(user, '');

        _xdr( _requestURL + "/user/register", "post", serialize(user), function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __POST http://api.jotform.com/user/login__
     * -----------------------------------
     */
    root.userLogin = function(user, callback, errback) {
        if (typeof user !== 'object') {
            console.error("User (first argument) should be object");
            return;
        }

        user = preparePOST(user, '');

        _xdr( _requestURL + "/user/login", "post", serialize(user), function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/user__
     * -----------------------------------
     */
    root.getUser = function(callback, errback) {
        var self = this;
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getUser(callback, errback);
            });
            return;
        }
        if (this.user && typeof this.user === 'object') {
            callback(this.user);
            return;
        }
        _xdr( _requestURL + "/user?apiKey=" + _apiKey, "get", undefined, function(resp) {
            self.user = resp;
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/usage__
     * ------------------------------------
     */
    root.getUsage = function(callback, errback) {
        var self = this;
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getUsage(callback, errback);
            });
            return;
        }
        if (this.usage && typeof this.usage === 'object') {
            callback(this.usage);
            return;
        }
        _xdr( _requestURL + "/user/usage?apiKey=" + _apiKey, "get", undefined, function(resp) {
            self.usage = resp;
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/user/submissions__
     * ----
     *
     * requests submissions according to given query
     * successful result will be passed to next function
     *
     * query is an object which may include
     *
     * filter: {"created_at:lt": 2013}  -- default: ""
     * offet: 10 -- default : 0
     * limit: 20 -- default: 100
     * orderby: "updated_at" -- default: ""
     * direction: "ASC" -- default: DESC
     *
     */
    root.getSubmissions = function(query, callback, errback) {
        if(arguments.length === 0) {
            console.error("callback function must be provided");
            return;
        }
        if(arguments.length === 1) {
            callback = query;
            query = undefined;
            errback = function(){}
        }
        if(arguments.length === 2) {
            if(typeof arguments[0] === 'function') {
                callback = query;
                errback = callback;
                query = undefined
            } else if(typeof arguments[0] === 'object') {
                errback = function(){}
            }
        }
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getSubmissions(query, callback, errback);
            });
            return;
        }
        var filter, offset, limit, orderby, direction;
        if (query && typeof query === 'object') {
            if (typeof query.filter === 'object' || query.filter) { filter = query.filter || filter; }
            offset = query.offset || offset;
            limit = query.limit || limit;
            orderby = query.orderby || orderby;
            if (query.direction === 'ASC' || query.direction === 'DESC') { direction =  query.direction || direction; }
        }
        var url = _requestURL + "/user/submissions?apiKey=" + _apiKey + (filter !== undefined ? "&filter=" + JSON.stringify(filter) : "") +
            (offset !== undefined ? "&offset=" + offset : "") +
            (limit !== undefined ? "&limit=" + limit : "") +
            (orderby !== undefined ? "&orderby=" + orderby : "&orderby=created_at") +
            (direction !== undefined ? "," + direction : "");
        _xdr( url, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };



    /**
     * __GET http://api.jotform.com/user/subusers__
     * ---------------------------------------
     */
    root.getSubUsers = function(callback, errback) {
        var self = this;
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getSubUsers(callback, errback);
            });
            return;
        }
        if (this.subusers && typeof this.subusers === 'object') {
            callback(this.subusers);
            return;
        }
        _xdr( _requestURL + "/user/subusers?apiKey=" + _apiKey, "get", undefined, function(resp) {
            self.subusers = resp;
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/folders__
     * --------------------------------------
     */
    root.getFolders = function(callback, errback) {
        var self = this;
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFolders(callback, errback);
            });
            return;
        }
        if (this.folders && typeof this.folders === 'object') {
            callback(this.folders);
            return;
        }
        _xdr( _requestURL + "/user/folders?apiKey=" + _apiKey, "get", undefined, function(resp) {
            self.folders = resp;
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/reports__
     * --------------------------------------
     */
    root.getReports = function(callback, errback) {
        var self = this;
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getReports(callback, errback);
            });
            return;
        }
        if (this.reports && typeof this.reports === 'object') {
            next(this.reports);
            return;
        }
        _xdr( _requestURL + "/user/reports?apiKey=" + _apiKey, "get", undefined, function(resp) {
            self.reports = resp;
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/form/{formID}/reports__
     * ----
     */
    root.getFormReports = function(formID, query, callback, errback) {
        if(arguments.length === 0) {
            console.err("form ID must be provided");
            return;
        }
        if(arguments.length === 1) {
            console.error("callback function must be provided");
            return;
        }
        if(arguments.length === 2) {
            callback = query;
            query = undefined;
            errback = function(){}
        }
        if(arguments.length === 3) {
            if(typeof arguments[1] === 'function') {
                callback = query;
                errback = callback;
                query = undefined
            } else if(typeof arguments[1] === 'object') {
                errback = function(){}
            }
        }
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormReports(formID, query, callback, errback);
            });
            return;
        }
        if (typeof formID === "undefined") {
            console.error("You should pass a valid form ID");
            return;
        }
        var filter, offset, limit, orderby, direction;
        if (query && typeof query === 'object') {
            if (typeof query.filter === 'object' || query.filter) { filter = query.filter || filter; }
            offset = query.offset || offset;
            limit = query.limit || limit;
            orderby = query.orderby || orderby;
            if (query.direction === 'ASC' || query.direction === 'DESC') { direction =  query.direction || direction; }
        }
        var url = _requestURL + "/form/" + formID + "/reports?apiKey=" + _apiKey + (filter !== undefined ? "&filter=" + JSON.stringify(filter) : "") +
            (offset !== undefined ? "&offset=" + offset : "") +
            (limit !== undefined ? "&limit=" + limit : "") +
            (orderby !== undefined ? "&orderby=" + orderby : "") +
            (direction !== undefined ? "," + direction : "");
        _xdr( url, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/settings__
     * ---------------------------------------
     */
    root.getSettings = function(callback, errback) {
        var self = this;
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getSettings(callback, errback);
            });
            return;
        }
        if (this.settings && typeof this.settings === 'object') {
            callback(this.settings);
            return;
        }
        _xdr( _requestURL + "/user/settings?apiKey=" + _apiKey, "get", undefined, function(resp) {
            self.settings = resp;
            callback(resp)
        }, errback);
    };

    /**
     * __POST http://api.jotform.com/user/settings__
     * ---------------------------------------------
     */
    root.updateSettings = function(settings, callback, errback) {
        var self = this;
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.updateSettings(settings, callback, errback);
            });
            return;
        }
        if (typeof settings !== 'object') {
            console.error("Settings (first argument) should be object");
            return;
        }

        settings = preparePOST(settings, '');

        _xdr( _requestURL + "/user/settings?apiKey=" + _apiKey, "post", serialize(settings), function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/forms__
     * ------------------------------------
     */
    root.getHistory = function(query, callback, errback) {
        var self = this;

        if(arguments.length === 0) {
            console.error("callback function must be provided");
            return;
        }
        if(arguments.length === 1) {
            callback = query;
            query = undefined;
            errback = function(){}
        }
        if(arguments.length === 2) {
            if(typeof arguments[0] === 'function') {
                callback = query;
                errback = callback;
                query = undefined
            } else if(typeof arguments[0] === 'object') {
                errback = function(){}
            }
        }
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getHistory(callback, errback);
            });
            return;
        }
        var action, date, sortBy, startDate, endDate;
        if (query && typeof query === 'object') {
            action = query.action || action;
            date = query.date || date;
            sortBy = query.sortBy || sortBy;
            startDate = query.startDate || startDate;
            endDate = query.endDate || endDate;
        }
        var url = _requestURL + "/user/history?apiKey=" + _apiKey +
            (action !== undefined ? "&action=" + action : "&action=all") +
            (date !== undefined ? "&date=" + date : "") +
            (sortBy !== undefined ? "&sortBy=" + sortBy : "&sortBy=ASC") +
            (startDate !== undefined ? "&startDate=" + startDate : "") +
            (endDate !== undefined ? "&endDate=" + endDate : "");

        _xdr( url, "get", undefined, function(resp) {
            self.history = resp;
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/forms__
     * ------------------------------------
     */
    root.getForms = function(query, callback, errback) {
        var self = this;

        if(arguments.length === 0) {
            console.error("callback function must be provided");
            return;
        }

        if(arguments.length === 1) {
            callback = query;
            query = undefined;
            errback = function(){}
        }

        if(arguments.length === 2) {
            if(typeof arguments[0] === 'function') {
                callback = query;
                errback = callback;
                query = undefined
            } else if(typeof arguments[0] === 'object') {
                errback = function(){}
            }
        }

        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getForms(query, callback, errback);
            });
            return;
        }

        var filter, offset, limit, orderby, direction;
        if (query && typeof query === 'object') {
            if (typeof query.filter === 'object' || query.filter) { filter = query.filter || filter; }
            offset = query.offset || offset;
            limit = query.limit || limit;
            orderby = query.orderby || orderby;
            if (query.direction === 'ASC' || query.direction === 'DESC') { direction =  query.direction || direction; }

            //do something to cached forms if cache set to false
            if ( typeof query.getcache === 'boolean' && query.getcache == false ) {
                this.forms = null;
            }
        }

        //cached forms
        if (this.forms && typeof this.forms === 'object') {
            callback(this.forms);
            return;
        }

        var url = _requestURL + "/user/forms?apiKey=" + _apiKey + (filter !== undefined ? "&filter=" + JSON.stringify(filter) : "") +
            (offset !== undefined ? "&offset=" + offset : "") +
            (limit !== undefined ? "&limit=" + limit : "") +
            (orderby !== undefined ? "&orderby=" + orderby : "") +
            (direction !== undefined ? "," + direction : "");

        _xdr( url, "get", undefined, function(resp) {
            self.forms = resp;
            callback(resp);
        }, errback);
    };

    /**
     * __POST http://api.jotform.com/forms__
     * ------------------------------------
     */
     root.createForm = function(formContent, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createForms(formContent, callback, errback);
            });
            return;
        }
        if (typeof formContent !== 'object') {
            console.error("Form Content (second argument) should be an object");
            return;
        }

        formContent = preparePOST(formContent, 'formContent');
        _xdr( _requestURL + "/user/forms?apiKey=" + _apiKey, "post", serialize(formContent), function(resp) {
            callback(resp)
        }, errback);
    };


    /**
     * __PUT http://api.jotform.com/forms__
     * ------------------------------------
     */
     root.createForms = function(formContent, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createForms(formContent, callback, errback);
            });
            return;
        }
        _xdr(_requestURL + "/user/forms?apiKey=" + _apiKey,
            "PUT",
            formContent,
            function(resp) {
                callback(resp);
            },
            errback);
    };



//-----------------------FORM-----------------------------------------

    /**
     * __GET http://api.jotform.com/form/{formID}__
     * --------------------------------------------
     */
    root.getForm = function(formID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getForm(formID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __DELETE http://api.jotform.com/form/{formID}__
     * --------------------------------------------
     */
     root.deleteForm = function(formID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.deleteForm(formID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "?apiKey=" + _apiKey, "DELETE", undefined, function(resp) {
            callback(resp)
        }, errback);
    };


    /**
     * __POST http://api.jotform.com/form/{formID}/clone__
     * --------------------------------------------
     */
    root.cloneForm = function(formID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createFormClone(formID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/clone?apiKey=" + _apiKey, "post", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/form/{formID}/questions__
     * ------------------------------------------------------
     */
    root.getFormQuestions = function(formID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormQuestions(formID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/questions?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __POST http://api.jotform.com/form/{formID}/questions__
     * ------------------------------------------------------
     */
     root.createFormQuestion = function(formID, question, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createFormQuestion(formID, question, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        if (typeof question !== 'object') {
            console.error("Question (second argument) should be an object");
            return;
        }

        question = preparePOST(question, 'question');
        _xdr( _requestURL + "/form/" + formID + "/questions?apiKey=" + _apiKey, "POST", serialize(question), function(resp) {
            callback(resp)
        }, errback);
    };

     /**
     * __PUT http://api.jotform.com/form/{formID}/questions__
     * ------------------------------------------------------
     */
     root.createFormQuestions = function(formID, questions, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createFormQuestions(formID, questions, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr(_requestURL + "/form/" + formID + "/questions?apiKey=" + _apiKey,
            "put",
            questions,
            function(resp) {
                callback(resp);
            },
            errback);
    };

    /**
     * __GET http://api.jotform.com/form/{formID}/question/{questionID}__
     * ----
     */
    root.getFormQuestion = function(formID, questionID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormQuestion(formID, questionID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        if (typeof questionID !== 'string') {
            console.error("Qeustion ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/question/" + questionID + "?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __POST http://api.jotform.com/form/{formID}/question/{questionID}__
     * ----
     */
     root.editFormQuestion = function(formID, questionID, question, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.editFormQuestion(formID, questionID, question, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be a string");
            return;
        }
        if (typeof questionID !== 'string') {
            console.error("Question ID should be a string");
            return;
        }
        if (typeof question !== 'object') {
            console.error("Question (second argument) should be an object");
            return;
        }
        //prepare labels, eg. "properties[styles]"
        question = preparePOST(question, 'question');

        _xdr( _requestURL + "/form/" + formID + "/question/" + questionID + "?apiKey=" + _apiKey, "post", serialize(question), function(resp) {
            callback(resp)
        }, errback);
    };

     /**
     * __DELETE http://api.jotform.com/form/{formID}/question/{questionID}__
     * ----
     */
     root.deleteFormQuestion = function(formID, questionID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.deleteFormQuestion(formID, questionID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        if (typeof questionID !== 'string') {
            console.error("Qeustion ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/question/" + questionID + "?apiKey=" + _apiKey, "delete", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

     /**
     * __GET http://api.jotform.com/form/{formID}/properties__
     * ----
     */
     root.getFormProperties = function(formID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormProperties(formID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/properties?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

     /**
     * __POST http://api.jotform.com/form/{formID}/properties__
     * ----
     */
    root.setFormProperties = function(formID, properties, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.setFormProperties(formID, properties, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be a string");
            return;
        }
        if (typeof properties !== 'object') {
            console.error("Properties (second argument) should be an object");
            return;
        }

        properties = preparePOST(properties, 'properties');
        _xdr( _requestURL + "/form/" + formID + "/properties?apiKey=" + _apiKey, "post", serialize(properties), function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __PUT http://api.jotform.com/form/{formID}/properties__
     * ----
     */
     root.setMultipleFormProperties = function(formID, properties, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createFormProperties(formID, properties, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr(_requestURL + "/form/" + formID + "/properties?apiKey=" + _apiKey,
            "put",
            properties,
            function(resp) {
                callback(resp);
            },
            errback);
    };

     /**
     * __GET http://api.jotform.com/form/{formID}/properties/{key}__
     * ----
     */

     root.getFormProperty = function(formID, key, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormProperty(formID, key, callback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be a string");
            return;
        }
        if (typeof key !== 'string') {
            console.error("Key should be a string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/properties/" + key + "?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/form/{formID}/files__
     * ----
     */
    root.getFormFiles = function(formID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormFiles(formID, callback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/files?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/form/{formID}/webhooks__
     * ----
     */
    root.getFormWebhooks = function(formID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormWebhooks(formID, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/webhooks?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

     /**
     * __POST http://api.jotform.com/form/{formID}/webhooks__
     * ----
     */
    root.createFormWebhook = function(formID, webHookUrl, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createFormWebhook(formID, webHookUrl, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        if (typeof webHookUrl !== 'string') {
            console.error("WebHookURL (second argument) should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/webhooks?apiKey=" + _apiKey, "post", "webhookURL=" + webHookUrl, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/form/{formID}/webhooks__
     * ----
     */
    root.deleteFormWebhook = function(formID, whid, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.deleteFormWebhook(formID, whid, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr( _requestURL + "/form/" + formID + "/webhooks/" + whid + "?apiKey=" + _apiKey, "delete", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __GET http://api.jotform.com/form/{formID}/submissions__
     * ----
     */
    root.getFormSubmissions = function(formID, query, callback, errback) {
        if(arguments.length === 0) {
            console.err("form ID must be provided");
            return;
        }
        if(arguments.length === 1) {
            console.error("callback function must be provided");
            return;
        }
        if(arguments.length === 2) {
            callback = query;
            query = undefined;
            errback = function(){}
        }
        if(arguments.length === 3) {
            if(typeof arguments[1] === 'function') {
                callback = query;
                errback = callback;
                query = undefined
            } else if(typeof arguments[1] === 'object') {
                errback = function(){}
            }
        }
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFormSubmissions(callback, formID, query);
            });
            return;
        }
        if (typeof formID === "undefined") {
            console.error("You should pass a valid form ID");
            return;
        }
        var filter, offset, limit, orderby, direction;
        if (query && typeof query === 'object') {
            if (typeof query.filter === 'object' || query.filter) { filter = query.filter || filter; }
            offset = query.offset || offset;
            limit = query.limit || limit;
            orderby = query.orderby || orderby;
            if (query.direction === 'ASC' || query.direction === 'DESC') { direction =  query.direction || direction; }
        }
        var url = _requestURL + "/form/" + formID + "/submissions?apiKey=" + _apiKey + (filter !== undefined ? "&filter=" + JSON.stringify(filter) : "") +
            (offset !== undefined ? "&offset=" + offset : "") +
            (limit !== undefined ? "&limit=" + limit : "") +
            (orderby !== undefined ? "&orderby=" + orderby : "") +
            (direction !== undefined ? "," + direction : "");
        _xdr( url, "get", undefined, function(resp) {
            callback(resp)
        });
    };

    /**
     * __POST http://api.jotform.com/form/{formID}/submissions__
     * ----
     */
    root.createFormSubmission = function(formID, submission, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createFormSubmission(formID, submission, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        if (typeof submission !== 'object') {
            console.error("Submission (second argument) should be object");
            return;
        }

        submission = preparePOST(submission, 'submission');

        _xdr( _requestURL + "/form/" + formID + "/submissions?apiKey=" + _apiKey, "post", serialize(submission), function(resp) {
            callback(resp)
        }, errback);
    };

    /**
     * __PUT http://api.jotform.com/form/{formID}/submissions__
     * ------------------------------------------------------
     */
     root.createFormSubmissions = function(formID, submissions, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.createFormSubmissions(formID, submissions, callback, errback);
            });
            return;
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        _xdr(_requestURL + "/form/" + formID + "/submissions?apiKey=" + _apiKey,
            "put",
            submissions,
            function(resp) {
                callback(resp);
            },
            errback);
    };
//-------------------SUBMISSIONS-----------------------

    /**
     * __GET http://api.jotform.com/submission/{id}__
     * ----
     */
     root.getSubmission = function(submissionID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getSubmission(submissionID, callback);
            });
            return;
        }
        if (typeof submissionID !== 'string') {
            console.error("Submission ID should be a string");
            return;
        }
        _xdr( _requestURL + "/submission/" + submissionID + "?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

     /**
     * __POST http://api.jotform.com/submission/{id}__
     * ----
     */
     root.editSubmission = function(submissionID, submission, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.editSubmission(submissionID, submission, callback, errback);
            });
            return;
        }
        if (typeof submissionID !== 'string') {
            console.error("Submission ID should be a string");
            return;
        }
        if (typeof submission !== 'object') {
            console.error("Submission (second argument) should be an object");
            return;
        }

        submission = preparePOST(submission, 'submission');
        _xdr( _requestURL + "/submission/" + submissionID + "?apiKey=" + _apiKey, "post", serialize(submission), function(resp) {
            callback(resp)
        }, errback);
    };

     /**
     * __DELETE http://api.jotform.com/submission/{id}__
     * ----
     */
     root.deleteSubmission = function(submissionID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.deleteSubmission(submissionID, callback);
            });
            return;
        }
        if (typeof submissionID !== 'string') {
            console.error("Submission ID should be a string");
            return;
        }
        _xdr( _requestURL + "/submission/" + submissionID + "?apiKey=" + _apiKey, "delete", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

//-------------------REPORTS----------------------
    /**
     * __GET http://api.jotform.com/report/{reportID}/__
     * ----
     */
    root.getReport = function(reportID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getReport(reportID, callback, errback);
            });
            return;
        }
        if (typeof reportID !== 'string') {
            console.error("Report ID should be string");
            return;
        }
        _xdr( _requestURL + "/report/" + reportID + "?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

    /**
    * __POST http://api.jotform.com/form/{formID}/reports__
    * ----
    */
    root.createReport = function(formID, report, callback, errback) {
        if (_apiKey === undefined || _apiKey === null ) {
            root.login(function(){
                root.createReport(formID, report, callback, errback);
            });
        }
        if (typeof formID !== 'string') {
            console.error("Form ID should be string");
            return;
        }
        if (typeof report !== 'object') {
            console.error("Report (second argument) should be object");
            return;
        }

        report = preparePOST(report, '');
        _xdr( _requestURL + "/form/" + formID + "/reports?apiKey=" + _apiKey, "post", serialize(report), function(resp) {
            callback(resp)
        }, errback);
    };

//-----------------FOLDERS-------------------------

    /**
     * __GET http://api.jotform.com/folder/{submissionID}/__
     * ----
     */
    root.getFolder = function(folderID, callback, errback) {
        if (_apiKey === undefined || _apiKey === null) {
            root.login(function() {
                root.getFolder(folderID, callback, errback);
            });
            return;
        }
        if (typeof folderID !== 'string') {
            console.error("Folder ID should be string");
            return;
        }
        _xdr( _requestURL + "/folder/" + folderID + "?apiKey=" + _apiKey, "get", undefined, function(resp) {
            callback(resp)
        }, errback);
    };

//------------------PLAN-----------------------------
    /**
     * __GET http://api.jotform.com/system/plan/{TYPE}/__
     * ----
     */
     root.getPlan = function(planType, callback) {
        if (typeof planType !== 'string') {
            console.error("Plan type should be string");
            return;
        }

        if(planType.match('http:')) {
            _xdr(planType, "get", undefined, function(resp) {
                callback(resp);
            });
        } else {
            _xdr(_requestURL + "/system/plan/" + planType.toUpperCase(), "get", undefined, function(resp) {
                callback(resp);
            });
        }
     }

 //--------------------------------END JS API FUNCTIONS---------------------

    //---Prepare for POST - labelize object (eg properties[labelWidth])
    function preparePOST(obj,label) {
        postData = new Object();
        for (var key in obj) {
            value = obj[key];
            if(label) {
                if(key.indexOf('_') !== -1) {
                    keys = key.split('_');
                    key = keys[0] + "][" + keys[1];
                }
                key = "[" + key + "]";
            }
            postData[ label + key] = value;
        }
        return postData;
    }

    //---Serialize objects for POST and PUT
    function serialize(data) {
          var str = [];
          for(var p in data)
             str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));
          return str.join("&");
    }

    /**
     * Implementation for helper functions begins here
     * -----------------------------------------------
     */
    function _createCORSRequest(method, url) {
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            xhr.open(method, url, true);
        } else if (XDomainRequest !== undefined) {
            xhr = new XDomainRequest();
            xhr.open(method, url);
        } else {
            xhr = null;
        }
        return xhr;
    }
    function _xdr(url, method, data, callback, errback) {
        var req;
        if(XMLHttpRequest) {
            createXHRRequest(url, method, data, callback, errback);
        } else if(XDomainRequest) {
            req = new XDomainRequest();
            req.open(method, url);
            req.onerror = errback;
            req.onload = function() {
                callback(req.responseText);
            };
            req.send(data);
        } else {
            errback(new Error('CORS not supported'));
        }
    }

    function createXHRRequest(url, method, data, callback, errback) {
        var req = new XMLHttpRequest();
        if('withCredentials' in req) {
            req.open(method, url, true);
            req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            req.onerror = errback;
            req.onreadystatechange = function() {
                if (req.readyState === 4) {
                    if (req.status >= 200 && req.status < 400) {
                        var resp = JSON.parse(req.responseText);
                        var responseErrorCodes = [400, 404, 401, 503, 301];
                        if(responseErrorCodes.indexOf(resp.responseCode) > -1) {
                            if(resp.responseCode === 301) {
                                // HIPAA
                                if (resp.location.indexOf('hipaa') > -1) {
                                    url = url.replace('api.', 'hipaa-api.');
                                    root.useHIPAA();
                                }
                                // EU
                                else {
                                    url = url.replace('api.', 'eu-api.');
                                    root.useEU();
                                }
                                createXHRRequest(url, method, data, callback, errback);
                                return;
                            }
                            errback(resp.message, resp.responseCode);
                            return;
                        }
                        callback(JSON.parse(req.responseText).content);
                    } else {
                        errback(new Error('Response returned with non-OK status'));
                    }
                }
            };
            req.send(data);
        }
    }

    function _getWindowDimensions() {
        var viewportwidth,
            viewportheight;
         // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
        if (window.innerWidth !== undefined) {
            viewportwidth = window.innerWidth;
            viewportheight = window.innerHeight;
        } else if (document.documentElement !== undefined && document.documentElement.clientWidth !== undefined && document.documentElement.clientWidth !== 0) {
            viewportwidth = document.documentElement.clientWidth;
            viewportheight = document.documentElement.clientHeight;
        } else {
            viewportwidth = document.getElementsByTagName('body')[0].clientWidth;
            viewportheight = document.getElementsByTagName('body')[0].clientHeight;
        }
        return {
            width: viewportwidth,
            height: viewportheight
        };
    };
    /** http://www.onlineaspect.com/2010/01/15/backwards-compatible-postmessage/ **/
    var XD = function() {
        var interval_id,
            last_hash,
            cache_bust = 1,
            attached_callback,
            window = this;
        return {
            postMessage : function(message, target_url, target) {
                if (!target_url) {
                    return;
                }
                target = target || parent;  // default to parent
                if (window.postMessage) {
                    // the browser supports window.postMessage, so call it with a targetOrigin
                    // set appropriately, based on the target_url parameter.
                    target.postMessage(message, target_url.replace( /([^:]+:\/\/[^\/]+).*/, '$1' ) );
                } else if (target_url) {
                    // the browser does not support window.postMessage, so use the window.location.hash fragment hack
                    target.location = target_url.replace(/#.*$/, '') + '#' + (+new Date) + (cache_bust++) + '&' + message;
                }
            },
            receiveMessage : function(callback, source_origin) {
                // browser supports window.postMessage
                if (window.postMessage) {
                    // bind the callback to the actual event associated with window.postMessage
                    if (callback) {
                        attached_callback = function(e) {
                            if ((typeof source_origin === 'string' && e.origin !== source_origin)
                                    || (Object.prototype.toString.call(source_origin) === "[object Function]" && source_origin(e.origin) === !1)) {
                                return !1;
                            }
                            callback(e);
                        };
                    }
                    if (window['addEventListener']) {
                        window[callback ? 'addEventListener' : 'removeEventListener']('message', attached_callback, !1);
                    } else {
                        window[callback ? 'attachEvent' : 'detachEvent']('onmessage', attached_callback);
                    }
                 } else {
                     // a polling loop is started & callback is called whenever the location.hash changes
                     interval_id && clearInterval(interval_id);
                     interval_id = null;
                     if (callback) {
                         interval_id = setInterval(function() {
                             var hash = document.location.hash,
                             re = /^#?\d+&/;
                             if (hash !== last_hash && re.test(hash)) {
                                 last_hash = hash;
                                 callback({data: hash.replace(re, '')});
                             }
                         }, 100);
                     }
                 }
             }
        };
    }();
    function removeElement(EId)
    {
        return (EObj = document.getElementById(EId)) ? EObj.parentNode.removeChild(EObj) : false;
    }

    root.bindXD = function(_baseURL){

        XD.receiveMessage(function(message){

            //parse message
            var msg = message.data;

            if(msg === false) {
                removeElement("jotform_oauth_frame_mask");
                if(typeof root.unsuccessfulLoginCallback === 'function'){
                    root.unsuccessfulLoginCallback();
                }
                return;
            }
            //successful login message must be in the form login:{API_KEY}
            if(typeof msg === 'string' && msg.match(/login:(.*)/) !== null) {
                var key = msg.match(/login:(.*)/)[1];
                removeElement("jotform_oauth_frame_mask");
                var key = msg.split(':')[1];
                if(!key){
                    if(typeof root.unsuccessfulLoginCallback === 'function'){
                        root.unsuccessfulLoginCallback();
                    }
                    return;
                }
                JF.initialize({apiKey: key});
                if(typeof root.successfulLoginCallback === 'function'){
                    root.successfulLoginCallback();
                }
            }

            //successful register
            if(typeof msg === 'string' && msg.match(/register:(.*)/) !== null) {
                removeElement("jotform_oauth_frame_mask");
                if(typeof root.successfulLoginCallback === 'function'){
                    root.successfulLoginCallback();
                }
            }
            // auto-resize oAuth iframe
            if(typeof msg === 'string' && msg.match(/resizeFrame:(.*)/)) {
                var frameHeight = msg.split(':')[1];
                document.getElementById('jotform_oauth_frame').style.height = frameHeight  + 'px';
            }

        });
    }

    //call it once
    root.bindXD(_baseURL);

    function _createCookie(name,value,days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        }
        else var expires = "";
        document.cookie = name+"="+value+expires+"; path=/; SameSite=None; Secure;";
    }
    function _readCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }
    function _eraseCookie(name) {
        _createCookie(name,"",-1);
    }
    function _setTextContent(element, text) {
        while (element.firstChild!==null)
            element.removeChild(element.firstChild); // remove all existing content
        element.appendChild(document.createTextNode(text));
    }
    /**
     * open http://www.jotform.com/api/oauth.php iframe if __apiKey is undefined
     *
     *
     * executes "success" callback function after successful login
     *
     *
     * executes "error" callback function if user does not allow
     *
     */
    function _login(success, error, onCloseCallback, isGuest) {
        if (_apiKey !== null) {
            if(success && typeof success === 'function') {
                success();
                return;
            }
        }

        var container = document.body,
            innerWidth = _getWindowDimensions().width,
            dimmer = document.createElement("div"),
            frame = document.createElement('IFRAME'),
            wrapperDiv = document.createElement("div"),
            margin = (innerWidth - 450) / 2,
            closeButton = document.createElement("a"),
            ref = document.location.href;
        dimmer.setAttribute("id", "jotform_oauth_frame_mask");
        dimmer.style.position = "fixed";
        dimmer.style.width = "100%";
        dimmer.style.height = "100%";
        dimmer.style.top = "0";
        dimmer.style.left = "0";
        dimmer.style.zIndex = "999999";
        // handle IE8 errors
        try {
            dimmer.style.background = "rgba(0,0,0,0.7)";
        } catch (e) {
            console.log("IE8 Error: rgba is not valid for prehistoric browsers");
        }

        wrapperDiv.setAttribute("id", "jotform_oauth_frame_wrapper");
        wrapperDiv.style.position = "absolute";
        wrapperDiv.style.top = 0;
        wrapperDiv.style.right = 0;
        wrapperDiv.style.bottom = 0;
        wrapperDiv.style.left = 0;
        wrapperDiv.style.zIndex = 9999;
        wrapperDiv.style.marginLeft = margin + "px";
        wrapperDiv.style.width = _oauthFrameWidth + "px";
        closeButton.style.display = "block";
        closeButton.style.left = "200px";
        _setTextContent(closeButton, 'Close X');
        // handle IE8 errors
        try {
            closeButton.style.backgroundColor = "transparent";
        } catch (e) {
            console.log("IE8 Error: rgba is not valid for prehistoric browsers");
        }
        closeButton.style.color = "white";
        closeButton.style.fontSize = "14px";
        closeButton.style.padding = "5px 8px";
        closeButton.style.cursor = "pointer";
        closeButton.style.styleFloat = "right";
        closeButton.style.cssFloat = "right";

        closeButton.onclick = function() {
            if(onCloseCallback !== undefined) {
                onCloseCallback();
            }
            removeElement("jotform_oauth_frame_mask");
        };

        wrapperDiv.appendChild(closeButton);
        if (ref[ref.length - 1] === '#') {
            ref = ref.substr(0, ref.length - 1);
        }

        var loginWindowParams = [
            'registrationType=oauth', 
            'ref=' + encodeURIComponent(ref),
            'client_id=' + (_appName !== undefined ? _appName : window.location.host),
            'access_type=' + _accessType, 
            'auth_type=' + _authType,
        ];

        if(isGuest !== undefined) {
            loginWindowParams.push('guest=true');
        }

        // push autocomplete params if existed
        if (_autocomplete) {
            loginWindowParams.push('autocomplete=' + encodeURIComponent(_autocomplete));
        }
        if(_authType == 'signup'){
            frame.setAttribute("scrolling", "yes");
            loginWindowParams.push('fullscreen=1');
        }else{
            frame.setAttribute("scrolling", "no");
        }

        frame.setAttribute("src", _loginWindowURL + "?" + loginWindowParams.join('&'));
        frame.setAttribute("id", "jotform_oauth_frame");
        
        frame.style.width = _oauthFrameWidth + "px";
        frame.style.height = _oauthFrameHeight + "px" ;
        frame.style.backgroundColor = "white";
        frame.style.border = "4px solid #aaa";
        frame.style.borderRadius = "4px";

        wrapperDiv.appendChild(frame);
        dimmer.appendChild(wrapperDiv);

        container.appendChild(dimmer);

        root.successfulLoginCallback = success;
        root.unsuccessfulLoginCallback = error;
    };
    return root;

})(JF || {});