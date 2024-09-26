import { intercept } from "@neptune";

export const interceptPromise = () => {
	timeoutMs ??= 5000;
	cancel ??= false;
	let res;
	let rej;
	const p = new Promise((_res, _rej) => {
		res = _res;
		rej = _rej;
	});
	const unloadRes = intercept(
		resActionType,
		(payload) => {
			res(payload);
			if (cancel) return true;
		},
		true,
	);
	if (!rej) throw new Error("Rejection function is not defined");
	const unloadRej = intercept(rejActionType, rej, true);
	const timeout = setTimeout(
		() => rej(`${rejActionType ?? resActionType}_TIMEOUT`),
		timeoutMs,
	);
	trigger();
	return p.finally(() => {
		clearTimeout(timeout);
		unloadRes();
		unloadRej();
	});
};
