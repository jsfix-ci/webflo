
/**
 * @imports
 */
import { _isString, _isFunction, _isArray } from '@webqit/util/js/index.js';
import { _from as _arrFrom } from '@webqit/util/arr/index.js';

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
	 * @param Context	        cx
	 * @param String|Array	    path
	 *
	 * @return void
	 */
	constructor(cx, path) {
        this.cx = cx;
        this.path = _isArray(path) ? path : (path + '').split('/').filter(a => a);
    }

    /**
     * Performs dynamic routing.
     * 
     * @param array|string      method
     * @param Object            event
     * @param any               arg
     * @param function          _default
     * @param function          remoteFetch
     * 
     * @return object
     */
    async route(method, event, arg, _default, remoteFetch = null) {

        const $this = this;
        const $runtime = this.cx.runtime;

        // ----------------
        // The loop
        // ----------------
        const next = async function(thisTick) {
            const thisContext = { runtime: $runtime };
            if (!thisTick.trail || thisTick.trail.length < thisTick.destination.length) {
                thisTick = await $this.readTick(thisTick);
                // -------------
                thisContext.pathname = `/${thisTick.trail.join('/')}`;
                thisContext.stepname = thisTick.trail[thisTick.trail.length - 1];
                $this.finalizeHandlerContext(thisContext, thisTick);
                // -------------
                if (thisTick.exports) {
                    // Broadcast any hints exported by handler
                    if (thisTick.exports.hints) { await event.port.post({ ...thisTick.exports.hints, $type: 'handler:hints' }); }
                    const methods = _arrFrom(thisTick.method);
                    const handler = _isFunction(thisTick.exports) && methods.includes('default') ? thisTick.exports : methods.reduce((_handler, name) => _handler || thisTick.exports[name.toLowerCase()], null);
                    if (handler) {
                        // -------------
                        // Dynamic response
                        // -------------
                        const _next = async (..._args) => {
                            const nextTick = { ...thisTick, arg: _args[0] };
                            if (_args.length > 1) {
                                var _url = _args[1], _request, requestInit = { ...(_args[2] || {}) };
                                if (_args[1] instanceof nextTick.event.Request) {
                                    _request = _args[1];
                                    _url = _request.url;
                                } else if (!_isString(_url)) {
                                    throw new Error('Router redirect url must be a string!');
                                }
                                var newDestination = _url.startsWith('/') ? _url : $this.pathJoin(`/${thisTick.trail.join('/')}`, _url);
                                if (newDestination.startsWith('../')) {
                                    throw new Error('Router redirect cannot traverse beyond the routing directory! (' + _url + ' >> ' + newDestination + ')');
                                }
                                if (requestInit.method) {
                                    nextTick.method = requestInit.method;
                                    if (_isArray(requestInit.method)) {
                                        requestInit.method = requestInit.method[0];
                                    }
                                }
                                if (_request) {
                                    nextTick.event = thisTick.event.retarget(_request, { ...requestInit, _proxy: { url: newDestination/** non-standard but works */ } });
                                } else {
                                    nextTick.event = thisTick.event.retarget(newDestination, requestInit);
                                }
                                
                                nextTick.source = thisTick.destination.join('/');
                                nextTick.destination = newDestination.split('?').shift().split('/').map(a => a.trim()).filter(a => a);
                                nextTick.trail = _args[1].startsWith('/') ? [] : thisTick.trail.reduce((_commonRoot, _seg, i) => _commonRoot.length === i && _seg === nextTick.destination[i] ? _commonRoot.concat(_seg) : _commonRoot, []);
                                nextTick.trailOnFile = thisTick.trailOnFile.slice(0, nextTick.trail.length);
                            }
                            return next(nextTick);
                        };
                        // -------------
                        const nextPathname = thisTick.destination.slice(thisTick.trail.length);
                        _next.pathname = nextPathname.join('/');
                        _next.stepname = nextPathname[0];
                        // -------------
                        return await handler.call(thisContext, thisTick.event, thisTick.arg, _next/*next*/, remoteFetch);
                    }
                    // Handler not found but exports found
                    return next(thisTick);
                } else if ((thisTick.currentSegmentOnFile || {}).dirExists) {
                    // Exports not found but directory found
                    return next(thisTick);
                }
            }
            // -------------
            // Local file
            // -------------
            if (_default) {
                return await _default.call(thisContext, thisTick.event, thisTick.arg, remoteFetch);
            }
        };
        
        return next({
            destination: this.path,
            event,
            method,
            arg,
         });

    }

}
