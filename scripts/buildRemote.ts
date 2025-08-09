import * as Bun from "bun";

const build = await Bun.build({
	entrypoints: ["./plugins/Remote/src/web/index.html"],
	//outdir: "./plugins/Remote/src/web/dist",
	minify: true,
});

const jsFile = build.outputs.find((out) => out.path.endsWith(".js"));
const jsText = await jsFile?.text();

const htmlFile = build.outputs.find((out) => out.path.endsWith(".html"));
let htmlText = await htmlFile?.text();

htmlText = (htmlText || "").replace(
	`<script type="module" crossorigin src="./chunk-${jsFile?.hash}.js"></script>`,
	`<script>${jsText}</script>`,
);

await Bun.write("./plugins/Remote/src/web/dist/index.html", htmlText);
