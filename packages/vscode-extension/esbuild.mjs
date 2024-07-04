import * as esbuild from "esbuild";
import copyStaticFiles from "esbuild-copy-static-files";
import path from "node:path";


const outputDirectory = "out";
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['./src/extension.ts'],
    outdir: path.join(outputDirectory, "src"),
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    external: ['vscode'],
    // logLevel: 'silent',
    plugins: [
      copyStaticFiles({
        src: "../fx-core/resource/",
        dest: path.join(outputDirectory, "resource"),
      }),
      copyStaticFiles({
        src: "../fx-core/templates/",
        dest: path.join(outputDirectory, "templates"),
      }),
      copyStaticFiles({
        src: "./src/commonlib/codeFlowResult/index.html",
        dest: path.join(outputDirectory, "src", "codeFlowResult", "index.html"),
      }),
      copyStaticFiles({
        src: "./src/chat/cl100k_base.tiktoken",
        dest: path.join(outputDirectory, "src", "chat", "cl100k_base.tiktoken"),
      }),
      copyStaticFiles({
        src: "./CHANGELOG.md",
        dest: path.join(outputDirectory, "resource", "CHANGELOG.md"),
      }),
      copyStaticFiles({
        src: "./PRERELEASE.md",
        dest: path.join(outputDirectory, "resource", "PRERELEASE.md"),
      }),
      copyStaticFiles({
        src: "./node_modules/@vscode/codicons/dist/codicon.css",
        dest: path.join(outputDirectory, "resource", "codicon.css"),
      }),
      copyStaticFiles({
        src: "./node_modules/@vscode/codicons/dist/codicon.ttf",
        dest: path.join(outputDirectory, "resource", "codicon.ttf"),
      }),
      copyStaticFiles({
        src: "./node_modules/dompurify/dist/purify.min.js",
        dest: path.join(outputDirectory, "resource", "purify.min.js"),
      }),
      copyStaticFiles({
        src: "./node_modules/mermaid/dist/mermaid.min.js",
        dest: path.join(outputDirectory, "resource", "mermaid.min.js"),
      }),
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin
    ]
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  }
};

main().catch(e => {
  console.error(e);
  process.exit(1);
});
