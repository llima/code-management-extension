$currentFolder = Get-Location;

# Front
npm run build --prefix front

# Tasks
Set-Location -Path .\tasks\release-merge\
npm install
Set-Location -Path $currentFolder
npm run build --prefix tasks/release-merge
    
tfx extension create --manifest-globs vss-extension.json --overrides-file ./configs/release.json --root ./