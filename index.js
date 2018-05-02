const fs = require('fs')
const dir = require('node-dir')
const path = require('path')
var asyncFromLib = require('asyncawait/async')
var awaitFromLib = require('asyncawait/await')

const FORK_CONFIG =  'Byzantium'

// tests which should be fixed
const skipBroken = [
  'CreateHashCollision', // impossible hash collision on generating address
  'RecursiveCreateContracts',
  'createJS_ExampleContract', // creates an account that already exsists
  'CreateCollisionToEmpty', // temporary till fixed (2017-09-21)
  'TransactionCollisionToEmptyButCode', // temporary till fixed (2017-09-21)
  'TransactionCollisionToEmptyButNonce', // temporary till fixed (2017-09-21)
  'RevertDepthCreateAddressCollision', // test case is wrong
  'randomStatetest642' // BROKEN, rustbn.js error
]

// tests skipped due to system specifics / design considerations
const skipPermanent = [
  'SuicidesMixingCoinbase', // sucides to the coinbase, since we run a blockLevel we create coinbase account.
  'static_SuicidesMixingCoinbase', // sucides to the coinbase, since we run a blockLevel we create coinbase account.
  'ForkUncle', // Only BlockchainTest, correct behaviour unspecified (?)
  'UncleFromSideChain' // Only BlockchainTest, same as ForkUncle, the TD is the same for two diffent branches so its not clear which one should be the finally chain
]
// tests running slow (run from time to time)
const skipSlow = [
  'Call50000', // slow
  'Call50000_ecrec', // slow
  'Call50000_identity', // slow
  'Call50000_identity2', // slow
  'Call50000_sha256', // slow
  'Call50000_rip160', // slow
  'Call50000bytesContract50_1', // slow
  'Call50000bytesContract50_2',
  'Call1MB1024Calldepth', // slow
  'static_Call1MB1024Calldepth', // slow
  'static_Call50000', // slow
  'static_Call50000_ecrec',
  'static_Call50000_identity',
  'static_Call50000_identity2',
  'static_Call50000_rip160',
  'static_Return50000_2',
  'Callcode50000', // slow
  'Return50000', // slow
  'Return50000_2', // slow
  'static_Call50000', // slow
  'static_Call50000_ecrec', // slow
  'static_Call50000_identity', // slow
  'static_Call50000_identity2', // slow
  'static_Call50000_sha256', // slow
  'static_Call50000_rip160', // slow
  'static_Call50000bytesContract50_1', // slow
  'static_Call50000bytesContract50_2',
  'static_Call1MB1024Calldepth', // slow
  'static_Callcode50000', // slow
  'static_Return50000', // slow
  'static_Return50000_2', // slow
  'QuadraticComplexitySolidity_CallDataCopy'
]

/*
NOTE: VM tests have been disabled since they are generated using Frontier gas costs, and happyucjs-vm doesn't support historical fork rules

TODO: some VM tests do not appear to be executing (don't print an "ok" statement):
...
# file: vmLogTest test: log0_emptyMem
ok 38984 valid gas usage
# file: vmLogTest test: log0_logMemStartTooHigh
# file: vmLogTest test: log0_logMemsizeTooHigh
# file: vmLogTest test: log0_logMemsizeZero
ok 38985 valid gas usage
# file: vmLogTest test: log0_nonEmptyMem
*/

const skipVM = [
  // slow performance tests
  'loop-mul',
  'loop-add-10M',
  'loop-divadd-10M',
  'loop-divadd-unr100-10M',
  'loop-exp-16b-100k',
  'loop-exp-1b-1M',
  'loop-exp-2b-100k',
  'loop-exp-32b-100k',
  'loop-exp-4b-100k',
  'loop-exp-8b-100k',
  'loop-exp-nop-1M',
  'loop-mulmod-2M',
  // some VM tests fail because the js runner executes CALLs
  // see https://github.com/happyuc-project/tests/wiki/VM-Tests  > Since these tests are meant only as a basic test of VM operation, the CALL and CREATE instructions are not actually executed.
  'ABAcalls0',
  'ABAcallsSuicide0',
  'ABAcallsSuicide1',
  'sha3_bigSize',
  'CallRecursiveBomb0',
  'CallToNameRegistrator0',
  'CallToPrecompiledContract',
  'CallToReturn1',
  'PostToNameRegistrator0',
  'PostToReturn1',
  'callcodeToNameRegistrator0',
  'callcodeToReturn1',
  'callstatelessToNameRegistrator0',
  'callstatelessToReturn1',
  'createNameRegistrator',
  'randomTest643' // TODO fix this
]

/**
 * Runs a battery of tests
 * @method runTests
 * @param {Function} runner the test runner
 * @param {Object} tests the tests usally fetched using `getTests`
 * @param {Function} filter to enable test skipping, called with skipFn(index, testName, testData)
 */
const getTests = exports.getTests = (testType, onFile, fileFilter = /.json$/, skipFn = () => {
  return false
}, testDir = '', excludeDir = '', testsPath = __dirname + '/tests') => { // eslint-disable-line
  return new Promise((resolve, reject) => {
    dir.readFiles(path.join(testsPath, testType, testDir), {
      match: fileFilter,
      excludeDir: excludeDir
    }, asyncFromLib((err, content, fileName, next) => {
      if (err) reject(err)

      fileName = path.parse(fileName).name
      const tests = JSON.parse(content)

      for (let testName in tests) {
        if (!skipFn(testName)) {
          awaitFromLib(onFile(fileName, testName, tests[testName]))
        }
      }
      next()
    }), (err, files) => {
      if (err) reject(err)
      resolve(files)
    })
  })
}

function skipTest (testName, skipList = []) {
  return skipList.map((skipName) => (new RegExp(`^${skipName}`)).test(testName)).some(isMatch => isMatch)
}

/**
 * Loads a single test specified in a file
 * @method getTestFromSource
 * @param {String} file or path to load a single test from
 * @param {Function} Callback function which is invoked, and passed the contents of the specified file (or an error message)
 */
const getTestFromSource = exports.getTestFromSource = function (file, onFile) {
  let stream = fs.createReadStream(file)
  let contents = ''
  let test = null

  stream.on('data', function (data) {
    contents += data
  }).on('error', function (err) {
    onFile(err)
  }).on('end', function () {
    try {
      test = JSON.parse(contents)
    } catch (e) {
      onFile(e)
    }

    let testName = Object.keys(test)[0]
    let testData = test[testName]
    testData.testName = testName

    onFile(null, testData)
  })
}

function getSkipTests (choices, defaultChoice) {
  let skipTests = []
  if (!choices) {
    choices = defaultChoice
  }
  choices = choices.toLowerCase()
  if (choices !== 'none') {
    let choicesList = choices.split(',')
    let all = choicesList.includes('all')
    if (all || choicesList.includes('broken')) {
      skipTests = skipTests.concat(skipBroken)
    }
    if (all || choicesList.includes('permanent')) {
      skipTests = skipTests.concat(skipPermanent)
    }
    if (all || choicesList.includes('slow')) {
      skipTests = skipTests.concat(skipSlow)
    }
  }
  return skipTests
}

exports.runTests = function(name, runnerArgs, cb) {
  let testGetterArgs = {}
  let argv           = {}

  testGetterArgs.skipTests = getSkipTests(argv.skip, argv.runSkipped ? 'NONE' : 'ALL')
  testGetterArgs.runSkipped = getSkipTests(argv.runSkipped, 'NONE')
  testGetterArgs.skipVM = skipVM
  testGetterArgs.forkConfig = FORK_CONFIG
  testGetterArgs.file = argv.file
  testGetterArgs.test = argv.test
  testGetterArgs.dir = argv.dir
  testGetterArgs.excludeDir = argv.excludeDir
  testGetterArgs.testsPath = argv.testsPath

  testGetterArgs.customStateTest = argv.customStateTest

  runnerArgs.forkConfig = FORK_CONFIG
  runnerArgs.jsontrace = argv.jsontrace
  runnerArgs.debug = argv.debug // for BlockchainTests

  // for GeneralStateTests
  runnerArgs.data = argv.data
  runnerArgs.gasLimit = argv.gas
  runnerArgs.value = argv.value

  // runnerArgs.vmtrace = true; // for VMTests

  if (argv.customStateTest) {
    const stateTestRunner = require('./GeneralStateTestsRunner.js')
    let fileName = argv.customStateTest
    tape(name, t => {
      testing.getTestFromSource(fileName, (err, test) => {
        if (err) {
          return t.fail(err)
        }

        t.comment(`file: ${fileName} test: ${test.testName}`)
        stateTestRunner(runnerArgs, test, t, () => {
          t.end()
        })
      })
    })
  } else {
    tape(name, t => {
      const runner = require(`./${name}Runner.js`)
      testing.getTestsFromArgs(name, (fileName, testName, test) => {
        return new Promise((resolve, reject) => {
          if (name === 'VMTests') {
            // suppress some output of VMTests
            // t.comment(`file: ${fileName} test: ${testName}`)
            test.fileName = fileName
            test.testName = testName
            runner(runnerArgs, test, t, resolve)
          } else {
            let runSkipped = testGetterArgs.runSkipped
            let inRunSkipped = runSkipped.includes(fileName)
            if (runSkipped.length === 0 || inRunSkipped) {
              t.comment(`file: ${fileName} test: ${testName}`)
              runner(runnerArgs, test, t, resolve)
            } else {
              resolve()
            }
          }
        }).catch(err => console.log(err))
      }, testGetterArgs).then(() => {
        t.end()
      })
    })
  }
}

exports.getTestsFromArgs = function (testType, onFile, args = {}) {
  let testsPath, testDir, fileFilter, excludeDir, skipFn

  skipFn = (name) => {
    return skipTest(name, args.skipTests)
  }

  if (testType === 'BlockchainTests') {
    const forkFilter = new RegExp(`${args.forkConfig}$`)
    skipFn = (name) => {
      return ((forkFilter.test(name) === false) || skipTest(name, args.skipTests))
    }
  }

  if (testType === 'VMTests') {
    skipFn = (name) => {
      return skipTest(name, args.skipVM)
    }
  }

  if (args.singleSource) {
    return getTestFromSource(args.singleSource, onFile)
  }

  if (args.dir) {
    testDir = args.dir
  }

  if (args.file) {
    fileFilter = new RegExp(args.file)
  }

  if (args.excludeDir) {
    excludeDir = new RegExp(args.excludeDir)
  }

  if (args.test) {
    skipFn = (testName) => {
      return testName !== args.test
    }
  }

  if (args.testsPath) {
    testsPath = args.testsPath
  }

  return getTests(testType, onFile, fileFilter, skipFn, testDir, excludeDir, testsPath)
}

exports.getSingleFile = (file) => {
  return require(path.join(__dirname, 'tests', file))
}
