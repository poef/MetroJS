function addElements(container, elements) {
  const currentElement = elements.shift()

  if (currentElement !== undefined) {
    container.appendChild(currentElement)

    if (currentElement.tagName === 'SCRIPT' && currentElement.src) {
      currentElement.addEventListener('load', () => addElements(container, elements))
    } else {
      addElements(container, elements)
    }
  }
}

function createHTML(text) {
  const elements = []
  const range = document.createRange()

  const fragment = range.createContextualFragment(text)

  fragment.childNodes.forEach(element => {
    console.info('element', element.nodeName, element)
    elements.push(element)
  })

  return elements
}

function createJS(text) {
  const script = document.createElement('script')
  script.type = 'module'

  text = replaceGitHubToken('my-token', text)

  script.innerHTML = text

  return script
}

function htmlEncoded(subject) {
  return subject.replace(/[\u00A0-\u9999<>&]/g, i => '&#' + i.charCodeAt(0) + ';')
}

function loadExample(fileType, text) {
  let content

  switch (fileType) {
    case 'html':
      content = createHTML(text)
      break
    case 'js':
      content = [createJS(text)]
      break
    default:
      throw new Error(`Unknown or Unsupported file type "${fileType}"`)
  }

  return content
}

function replaceGitHubToken(subject, text) {
  if (text.includes(subject)) {
    let token = ''

    if ( ! document.location.search.includes('token=')) {
      token = prompt(`
                    This example requires a GitHub Personal Access Token (PAT) to work.

                    Please call this example with your PAT added to the URL as "?token=GH-TOKEN" (replacing GH-TOKEN with your PAT)

                    Or provide a PAT in the prompt below
                `)
    } else {
      token = document.location.search.split('token=')[1]
    }

    text = text.replace(subject, token)
  }

  return text
}