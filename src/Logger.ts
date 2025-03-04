import {
	CallSite,
	LoggerOptions,
	LogContent,
	LogLevel,
	LogLevelType,
	Partial
} from './types';

import merge from '@eartharoid/deep-merge';
import defaults from './defaults';
import { relative } from 'path';
import { format } from 'util';

export default class Logger {
	public defaults: LoggerOptions;
	private _options: LoggerOptions;
	public levels: Array<string>;

	constructor(options: Partial<LoggerOptions> = {}) {
		this.defaults = defaults;
		this._options = merge(this.defaults, options);
		this.levels = Object.keys(this._options.levels);
		this._init();
	}

	private _init() {
		this.levels = Object.keys(this._options.levels);

		if (this._options.transports.length < 1) throw new Error('At least one logger transport is required. Remove `transports` from your options to use the defaults.');

		for (const level in this._options.levels) {
			const log_level: LogLevel = {
				name: level,
				number: this.levels.indexOf(level),
				type: <LogLevelType>this._options.levels[level],
			};
			this[level] = (...content: LogContent) => this.log(null, log_level, ...content);

			for (const namespace of this._options.namespaces) {
				this[level][namespace] = (...content: LogContent) => this.log(namespace, log_level, ...content);
			}
		}
	}

	public log(namespace: string | null, level: LogLevel, ...content: LogContent): void {
		const _prepareStackTrace = Error.prepareStackTrace; // eslint-disable-line no-underscore-dangle
		Error.prepareStackTrace = (_, stack) => stack;
		const stack = <Array<CallSite> | undefined>new Error().stack;
		const callsite = stack ? stack[2] : null;
		Error.prepareStackTrace = _prepareStackTrace;

		for (const transport of this._options.transports) {
			if (level.number >= this.levels.indexOf(transport.level)) {
				transport.write({
					column: callsite ? callsite.getColumnNumber() : null,
					content: format(...content),
					file: callsite?.getFileName() ? relative(process.cwd(), <string>callsite?.getFileName()) : null,
					level,
					line: callsite ? callsite.getLineNumber() : null,
					namespace,
					timestamp: new Date(),
				});
			}
		}
	}

	get options(): Partial<LoggerOptions> {
		return this._options;
	}

	set options(options: Partial<LoggerOptions>) {
		this._options = merge(this._options, options);
		this._init();
	}
}

declare module '.' {
	interface Logger {
		debug(...content: LogContent): void;
		verbose(...content: LogContent): void;
		info(...content: LogContent): void;
		success(...content: LogContent): void;
		warn(...content: LogContent): void;
		notice(...content: LogContent): void;
		error(...content: LogContent): void;
		critical(...content: LogContent): void;
	}
}