
/**
 * @imports
 */
import { _after, _beforeLast } from "@webqit/util/str/index.js";
import { _isString, _getType, _isObject } from "@webqit/util/js/index.js";
import _Headers from './xHeaders.js';

/**
 * The _Headers Mixin
 */
const _ResponseHeaders = NativeHeaders => class extends _Headers(NativeHeaders) {

    set cookies(cookieJar) {
        if (!_isObject(cookieJar)) {
            throw new Error(`The "cookies" response directive cannot be of type: ${_getType(cookieJar)}`);
        }
        for (let cookieName in cookieJar) {
            let cookieBody = cookieJar[cookieName];
            if (_isObject(cookieBody)) {
                let attrsArr = [ cookieBody.value ];
                for (let attrName in cookieBody) {
                    if (attrName === 'value') continue;
                    let _attrName = attrName[0].toUpperCase() + attrName.substring(1);
                    if (_attrName === 'MaxAge') { _attrName = 'Max-Age' };
                    attrsArr.push(cookieBody[attrName] === true ? _attrName : `${_attrName}=${cookieBody[attrName]}`);
                }
                cookieBody = attrsArr.join('; ');
            } 
            this.append('Set-Cookie', `${cookieName}=${cookieBody}`);
        }
        return true;
    }

    get cookies() {
        const cookiesStr = this.get('Set-Cookie');
        return cookiesStr && cookiesStr.split(',').reduce((cookieJar, str) => {
            let [ cookieDefinition, attrsStr ] = str.split(';');
            let [ cookieName, cookieValue ] = cookieDefinition.trim().split('=');
            cookieJar[cookieName] = { value: cookieValue, };
            if (attrsStr) {
                (attrsStr || '').split(/\;/g).map(attrStr => attrStr.trim().split('=')).forEach(attrsArr => {
                    cookieJar[cookieName][attrsArr[0][0].toLowerCase() + attrsArr[0].substring(1).replace('-', '')] = attrsArr.length === 1 ? true : attrsArr[1];
                });
            }
            return cookieJar;
        }, {});
    }

    set contentRange(value) {
        if (Array.isArray(value)) {
            if ((value.length === 2 && !value[0].includes('-')) || value.length < 2) {
                throw new Error(`A Content-Range array must be in the format: [ 'start-end', 'total' ]`);
            }
            return this.set('Content-Range', `bytes ${value.join('/')}`);
        }
        return this.set('Content-Range', value);
    }

    get contentRange() {
        const value = this.get('Content-Range');
        return value && _after(value, 'bytes ').split('/');
    }

    set cors(value) {
        return this.set('Access-Control-Allow-Origin', value === true ? '*' : (value === false ? '' : value));
    }

    get cors() {
        return this.get('Access-Control-Allow-Origin');
    }

    set attachment(value) {
        value = value === true ? 'attachment' : (value === false ? 'inline' : value);
        if (!_isString(value)) {
            throw new Error(`The "download" response directive does not support the type: ${_getType(value)}`);
        }
        if (![ 'attachment', 'inline' ].includes(value)) {
            value = `attachment; filename="${value}"`;
        }
        return this.set('Content-Disposition', value);
    }

    get attachment() {
        var value = (this.get('Content-Disposition') || '').trim();
        value = value === 'attachment' ? true : (
            value === 'inline' ? false : _after(_beforeLast(value, '"'), 'filename="')
        );
        return value;
    }

    get location() {
        return this.get('Location');
    }

    set location(value) {
        return this.set('Location', value);
    }

    get redirect() {
        return this.get('Location');
    }

    set redirect(value) {
        return this.set('Location', value);
    }

}

export default _ResponseHeaders;