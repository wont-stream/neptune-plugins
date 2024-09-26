import { actions } from "@neptune";

export const Tracer = (source) => {
	const createLogger = (logger) => {
		const _logger = (...data) => {
			logger(source, ...data);
			return undefined;
		};
		_logger.withContext =
			(context) =>
			(...data) => {
				logger(source, context, ...data);
				return undefined;
			};
		return _logger;
	};

	const log = createLogger(console.log);
	const warn = createLogger(console.warn);
	const err = createLogger(console.error);
	const debug = createLogger(console.debug);

	const createMessager = (logger, messager, severity) => {
		const _messager = (message) => {
			logger(message);
			messager({
				message: `${source} - ${message}`,
				category: "OTHER",
				severity,
			});
			return undefined;
		};
		_messager.withContext = (context) => {
			const loggerWithContext = logger.withContext(context);
			return (message) => {
				loggerWithContext(message);
				let finalMessage = message;
				if (message instanceof Error) finalMessage = message.message;
				messager({
					message: `${source}.${context} - ${message}`,
					category: "OTHER",
					severity,
				});
				return undefined;
			};
		};
		return _messager;
	};

	return {
		log,
		warn,
		err,
		debug,
		msg: {
			log: createMessager(log, actions.message.messageInfo, "INFO"),
			warn: createMessager(warn, actions.message.messageWarn, "WARN"),
			err: createMessager(err, actions.message.messageError, "ERROR"),
		},
	};
};

export const libTrace = Tracer("[lib]");
