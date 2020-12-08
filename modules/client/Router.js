
/**
 * @imports
 */
import _isString from '@webqit/util/js/isString.js';
import _isFunction from '@webqit/util/js/isFunction.js';
import _isArray from '@webqit/util/js/isArray.js';
import _arrFrom from '@webqit/util/arr/from.js';

/**
 * ---------------------------
 * The Router class
 * ---------------------------
 */
			
export default class Router {

	/**
	 * Constructs a new Router instance
     * over route definitions.
	 *
	 * @param string|array	    path
	 * @param object	        params
	 *
	 * @return void
	 */
	constructor(path, params) {
        this.path = _isArray(path) ? path : (path + '').split('/').filter(a => a);
        this.params = params;
    }

    /**
     * Performs dynamic routing.
     * 
     * @param array             args
     * @param array|string      target
     * @param function          _default
     * 
     * @return object
     */
    async route(args, target, _default) {

        target = _arrFrom(target);
        var path = this.path;
        var routeTree = this.params.ROUTES;

        // ----------------
        // The loop
        // ----------------
        const next = async function(index, output) {

            var exports;
            if (index === 0) {
                exports = routeTree['/'];
            } else if (path[index - 1]) {
                var currentHandlerPath = '/' + path.slice(0, index).join('/');
                var wildcardCurrentHandlerPath = path.slice(0, index - 1).concat('_').join('/');
                exports = routeTree[currentHandlerPath] || routeTree[wildcardCurrentHandlerPath];
            }

            if (exports) {
                var func = _isFunction(exports) && target.includes('default') ? exports : target.reduce((func, name) => func || exports[name], null);
                if (func) {
                    // -------------
                    // Dynamic response
                    // -------------
                    var _next = (..._args) => next(index + 1, ..._args);
                    _next.pathname = path.slice(index).join('/');
                    // -------------
                    var _this = {};
                    _this.pathname = '/' + path.slice(0, index).join('/');
                    // -------------
                    return await func.bind(_this)(...args.concat([output, _next/*next*/]));
                }
            }

            if (_default) {
                // -------------
                // Local file
                // -------------
                return await (arguments.length === 2 ? _default(output) : _default());
            }
    
            // -------------
            // Recieved response or undefined
            // -------------
            return output;
        };
        
        return next(0);
    } 
};