const { watch } = require('gulp');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function textures(file) {
    exec(`node dist/tools/compileTextures.js "${file}"`, function (err, stdout, stderr) {
        const outPath = path.dirname(file);
        const outName = path.basename(file, ".sdf");
        fs.writeFile(`${outPath}/${outName}.ts`, stdout, () => { });
    });
}

function shaders(file) {
    exec(`tools/glsl/minify_glsl.sh src/core/renderer/shaders src/core/renderer/shaders/shaders.ts`, function (err, stdout, stderr) {
    });
}


function maps(file) {
    exec(`node dist/tools/compileMap.js "${file}"`, function (err, stdout, stderr) {
        const outPath = path.dirname(file);
        const outName = path.basename(file, ".map");
        fs.writeFile(`${outPath}/${outName}.ts`, `export const ${outName} = "${stdout.trim()}";\n`, () => { });
    });
}

exports.default = () => {
    watch('src/assets/maps/*.map', { ignoreInitial: false }).on('change', maps);
    watch('src/assets/*.sdf', { ignoreInitial: false }).on('change', textures);

    watch('src/core/renderer/shaders/*.vert', { ignoreInitial: false }).on('change', shaders);
    watch('src/core/renderer/shaders/*.frag', { ignoreInitial: false }).on('change', shaders);
    
}
