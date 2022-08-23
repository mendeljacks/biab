import { MochaOptions } from 'mocha'
import fs from 'fs'
import Mocha from 'mocha'
import path from 'path'

/**
 * A programmatic way to run mocha tests
 * If any test fails the promise rejects
 * If all tests pass, the promise resolves
 */
export const run_tests = async (mocha_opts: MochaOptions, predicate, root_dir) => {
    const result = await new Promise((resolve, reject) => {
        const mocha = new Mocha(mocha_opts)
        /**
         * Gets the test .js file paths recursively from a given directory.
         * @param {String} dir - path to directory containing test files.
         * @returns {Array} Filepaths to each test .js file.
         */
        function getTestPaths(dir, fileList) {
            var files = fs.readdirSync(dir)
            fileList = fileList || []

            files.forEach(function (file) {
                if (fs.statSync(path.join(dir, file)).isDirectory()) {
                    fileList = getTestPaths(path.join(dir, file), fileList)
                } else {
                    fileList.push(path.join(dir, file))
                }
            })

            return fileList.filter(predicate)
        }

        // Get all .js paths and add each file to the mocha instance.
        const test_files = getTestPaths(root_dir, [])
        test_files.forEach(function (file) {
            mocha.addFile(path.join(file))
        })

        mocha
            .run()
            .on('fail', e => {
                reject(e)
            })
            .on('end', async e => {
                resolve(e)
            })
    })
    return result
}
