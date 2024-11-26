#!/usr/bin/env bash

set -o errexit  # Exit script when a command exits with non-zero status.
set -o errtrace # Exit on error inside any functions or sub-shells.
set -o nounset  # Exit script on use of an undefined variable.
set -o pipefail # Return exit status of the last command in the pipe that exited with a non-zero exit code

# ==============================================================================
#/ Extract HTML and JS code examples from Markdown files
# ------------------------------------------------------------------------------
#/
#/ Usage: $0 [-h] <path>
#/
#/ Where:
#/         <path>      The path to the Markdown files to extract examples from
#/
#/ Options:
#/         -h|--help       Print this help dialogue and exit
#/
#/ This script will recursively extract all the code examples from the Markdown
#/ files found in the given path. The extracted examples will be saved in a
#/ directory called 'examples' in the same directory as the Markdown file(s).
#/
#/ The script will look for code blocks that start with "```javascript" or
#/ "```html". It will extract the content of the code block and save it in a
#/ file with the same name as the Markdown file but with a number at the end and
#/ a .js or .html extension (depending on the code block).
#/
#/ For example, if the Markdown file is called 'example.md', the extracted
#/ examples will be saved in 'examples/example.1.js', 'examples/example.2.js',
#/
#/ Usage example:
#/
#/    $0 ./docs

: "${OUTPUT_ERROR:=/dev/stderr}"
: "${OUTPUT_NORMAL:=/dev/stdout}"

: readonly "${COLOR_RED:=$(tput setaf 1)}"
: readonly "${COLOR_WHITE:=$(tput setaf 7)}"
: readonly "${RESET_TEXT:=$(tput sgr0)}"      # turn off all attributes
: readonly "${TEXT_BOLD:=$(tput bold)}"       # turn on bold (extra bright) mode
: readonly "${TEXT_DIM:=$(tput dim)}"         # turn on half-bright mode
: readonly -i "${EXIT_NOT_ENOUGH_PARAMETERS:=65}"

error(){
    if [ ${#} == 1 ];then
        logMessage "ERROR " "${COLOR_RED}" "${@}" "Call with ${TEXT_BOLD}--help${RESET_TEXT}${TEXT_DIM} for more information." >&2
    else
        logMessage "ERROR " "${COLOR_RED}" "${@}" >&2
    fi
}

logMessage(){
    local sType="${1?Three parameters required: <type> <color> <message>}"
    local sColor="${2?Three parameters required: <type> <color> <message>}"
    local sMessage="${3?Three parameters required: <type> <color> <message>}"

    message "${COLOR_WHITE}[${sColor}${sType}${COLOR_WHITE}]${RESET_TEXT}" "${sMessage}"

    # Each additional parameter will be treated as extra information to display with the error
    if [[ "$#" -gt 3 ]]; then
        shift 3
        for sMessage in "$@"; do
            message "        " "${TEXT_DIM}${sMessage}${RESET_TEXT}"
        done
    fi
}

message(){
    local sPrefix="${1?Two parameters required: <message-prefix> <message>}"
    local sMessage="${2?Two parameters required: <message-prefix> <message>}"

    echo -e "${sPrefix} ${sMessage}"
}

statusMessage() {
    message " -----> " "${@}"
}

topicMessage() {
    message " =====> " "${@}"
}

usage() {
    local sFile sScript sUsage

    readonly sFile="${0}"

    sScript="$(basename "${sFile}")"
    sUsage="$(grep '^#/' < "${sFile}" | cut -c4-)"

    readonly sScript sUsage

    echo -e "${sUsage//\$0/${sScript}}\n" >> /dev/stdout
}

extract_examples() {
    local -i iCounter
    local sBaseName sDirname sFile sPath sExamplePath


    if [[ ${#@} -lt 1 ]]; then
        error "One parameter required: <path>"
        exit "${EXIT_NOT_ENOUGH_PARAMETERS}"
    fi


    if [[ "$1" == '-h' || "$1" == '--help' ]];then
        usage
        return 0
    fi

    local sPath="${1?One parameter required: <path>}"

    sPath="$(realpath "${sPath}")"
    sExamplePath="${sPath}/examples"

    topicMessage "Extracting examples from ${sPath} to ${sExamplePath}"

    while IFS= read -r -d '' sFile; do
        iCounter=0
        sDirname="$(dirname "${sFile}")"
        sDirname="${sDirname#"${sPath}"}"
        sBaseName="$(basename "${sFile}" '.md')"

        # shellcheck disable=SC2016
        grep -ozP '```(javascript|html)(.|\n)+?```' < "${sFile}" | while IFS= read -r sLine; do
            local sFilename sExtension

            if grep -qP '```(javascript|html)' <<< "${sLine}"; then
                iCounter=$((iCounter + 1))
                statusMessage "Found example ${iCounter} in ${sDirname}/${sBaseName}.md"
                sExtension="$(grep -oP '```(javascript|html)' <<< "${sLine}" | cut -c 4-)"
                if [ "${sExtension}" == "javascript" ]; then
                    sExtension="js"
                fi

                sFilename="${sExamplePath}${sDirname}/${sBaseName}.${iCounter}.${sExtension}"

                if [ ! -d "$(dirname "${sFilename}")" ]; then
                    mkdir -p "$(dirname "${sFilename}")"
                fi

                echo '' > "${sFilename}"
            else
                echo "${sLine}" >> "${sFilename}"
            fi
        done
    done < <(find "${sPath}" -type f -name '*.md' -print0)
}

if [ "$0" != "${BASH_SOURCE[0]}" ]; then
    export -f extract_examples
else
    extract_examples "${@}"
fi
