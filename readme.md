## 3PL Dependency Resolution Helper
A utility to check state of third party NPM libraries inconsistencies.

### Pre-requisite
1. The utility needs `yarn2`. Migrate your project from yarn 1 to yarn 2  
```
yarn set version berry

// Update .yarnrc.yml 
nodeLinker: node-modules

npmRegistryServer: "https://artifactory.../"

plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-workspace-tools.cjs
    spec: "@yarnpkg/plugin-workspace-tools"

yarnPath: .yarn/releases/yarn-3.2.0.cjs
```
[Yarn official migration guide](https://yarnpkg.com/getting-started/migration)

2. Add required 3PL
```
yarn add ts-node typescript googleapis
```

### Running utility
Let's say you downloaded depugrader to `$HOME/github/depupgrader` directory and the project you need to check 3PL state is at `$HOME/github/myproject`
```
// 1. Go to your project
cd ~/github/myproject

// 2. Run script from this directory
node -r ts-node/register ~/dev/depupgrader/src/packageInfo.ts

// 3. Now upgrade any package to see its impage
yarn up react@17.0.2

// 4. Run utility again
node -r ts-node/register ~/dev/depupgrader/src/packageInfo.ts
```