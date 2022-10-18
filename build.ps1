$currentFolder = Get-Location;

# Front
npm run build --prefix front

# Tasks
Set-Location -Path .\tasks\release-merge\
npm install
Set-Location -Path $currentFolder
npm run build --prefix tasks/release-merge

# Tasks
Set-Location -Path .\tasks\work-marker\
npm install
Set-Location -Path $currentFolder
npm run build --prefix tasks/work-marker

# Tasks
Set-Location -Path .\tasks\main-merge\
npm install
Set-Location -Path $currentFolder
npm run build --prefix tasks/main-merge

# Tasks
Set-Location -Path .\tasks\build-version\
npm install
Set-Location -Path $currentFolder
npm run build --prefix tasks/build-version
    
tfx extension create --manifest-globs vss-extension.json --overrides-file ./configs/release.json --root ./