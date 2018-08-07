# SYNOPSIS  
[![Build Status](https://img.shields.io/travis/icjs/icjs-testing.svg?branch=master&style=flat-square)](https://travis-ci.org/icjs/icjs-testing)
[![Gitter](https://img.shields.io/gitter/room/icjs/icjs-lib.svg?style=flat-square)]() or #icjs on freenode

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Testing utilities for the icjs stack.

Uses the offical [IrChain Tests](https://github.com/irchain/tests).

To fetch the latest test:
```
git submodule init
git submodule update
cd tests
git pull origin develop
```

## API

```
const testing = require('icjs-testing')
```

#### `testing.getTestsFromArgs(testType, onFile, args = {})`
Reads test of a certain test type from several folders and files
- `testType` - Type of the test (``GeneralStateTests``, ``BlockchainTests``, ``VMTests``)
- `onFile` - Function to run the test (see example)
- `args`
  - `forkConfig` - Run test for selected fork (``BlockchainTests`` only)
  - `dir` - Only run test from subdirectory
  - `file` - File filter to apply
  - `excludeDir` - Exclude directory filter to apply
  - `test` - Only run a single test case
  - `testsPath` - Path to the test repository (without the ``test`` dir)
  - `skipTests` - List of test to skip
  - `skipVM` - List of VM test to skip

#### `testing.getTestFromSource(file, onFile)`
Reads custom test from a relative path or file
- `file` - Relative path or filename
- `onFile` - Function to run the test (see example)

#### `testing.getSingleFile(file)`
Reads a single test file
- `file` - Path to the file


Examples how to read test with the API methods above can be found in
the [./examples](./examples/) directory.
  
