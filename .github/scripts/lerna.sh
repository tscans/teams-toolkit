#!/bin/bash
VAR=$@
echo ============= Inputs: $VAR ================
stringarray=($VAR)
if [ -z $stringarray ]; then
    echo "for all the pkgs"
    exit 0
else 
    git update-index --assume-unchanged "pnpm-workspace.yaml"
    content=$(jq ".common" .github/scripts/lernaDeps.json)
    for i in "${stringarray[@]}"
    do :
        echo package name: $i
        if [ $(jq --arg v "$i" 'has($v)' .github/scripts/lernaDeps.json) == 'false' ]; then
            echo "Get Error Inputs:" $i
            exit -1
        fi
        pkgContent=$(jq --arg a "$i" '.[$a]' -r .github/scripts/lernaDeps.json)
        content=$(jq --argjson arr1 "$content" --argjson arr2 "$pkgContent" -n '$arr1 + $arr2 | unique')
    done
    content=$(echo $content|jq -r '.[]')
    echo ======== deps: $content ==========
    echo "packages:" > tmp.$$.yaml
    for key in $content
    do
        echo "- $key" >> tmp.$$.yaml
    done
    mv tmp.$$.yaml pnpm-workspace.yaml
    cat pnpm-workspace.yaml
fi