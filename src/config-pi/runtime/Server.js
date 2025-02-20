
/**
 * imports
 */
import { _merge } from '@webqit/util/obj/index.js';
import { Dotfile } from '@webqit/backpack';

export default class Server extends Dotfile {

    // Base name
    get name() {
        return 'server';
    }

    // @desc
    static get ['@desc']() {
        return 'Server Runtime config.';
    }

    // Defaults merger
    withDefaults(config) {
        return _merge(true, {
            port: process.env.port || 3000,
            https: {
                port: 0,
                keyfile: '',
                certfile: '',
                certdoms: ['*'],
                force: false,
            },
            force_www: '',
            oohtml_support: 'full',
            shared: false,
        }, config);
    }

    // Questions generator
    questions(config, choices = {}) {
        // Choices
        const CHOICES = _merge({
            force_www: [
                {value: '', title: 'do nothing'},
                {value: 'add',},
                {value: 'remove',},
            ],
            oohtml_support: [
                {value: 'full', title: 'full'},
                {value: 'namespacing', title: 'namespacing'},
                {value: 'scripting', title: 'scripting'},
                {value: 'templating', title: 'templating'},
                {value: 'none', title: 'none'},
            ],
        }, choices);
        // Questions
        return [
            {
                name: 'port',
                type: 'number',
                message: '[port]: Enter port number',
                initial: config.port,
                validation: ['important'],
            },
            {
                name: 'https',
                controls: {
                    name: 'https',
                },
                initial: config.https,
                questions: [
                    {
                        name: 'port',
                        type: 'number',
                        message: '[port]: Enter HTTPS port number',
                        validation: ['important'],
                    },
                    {
                        name: 'keyfile',
                        type: 'text',
                        message: '[keyfile]: Enter SSL KEY file',
                        validation: ['important'],
                    },
                    {
                        name: 'certfile',
                        type: 'text',
                        message: '[certfile]: Enter SSL CERT file',
                        validation: ['important'],
                    },
                    {
                        name: 'certdoms',
                        type: 'list',
                        message: '[certdoms]: Enter the CERT domains (comma-separated)',
                        validation: ['important'],
                    },
                    {
                        name: 'force',
                        type: 'toggle',
                        message: '[force]: Force HTTPS?',
                        active: 'YES',
                        inactive: 'NO',
                    },
                ],
            },
            {
                name: 'force_www',
                type: 'select',
                message: '[force_www]: Force add/remove "www" on hostname?',
                choices: CHOICES.force_www,
                initial: this.indexOfInitial(CHOICES.force_www, config.force_www),
            },
            {
                name: 'oohtml_support',
                type: 'select',
                message: '[oohtml_support]: Specify OOHTML support level',
                choices: CHOICES.oohtml_support,
                initial: this.indexOfInitial(CHOICES.oohtml_support, config.oohtml_support),
                validation: ['important'],
            },
            {
                name: 'shared',
                type: 'toggle',
                message: '[shared]: Shared server?',
                active: 'YES',
                inactive: 'NO',
                initial: config.shared,
            },
        ];
    }
}
