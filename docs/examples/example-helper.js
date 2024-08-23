function addElements(container, elements, metroLoaded = false) {
  if (metroLoaded === false && elements.length === 1 && elements[0].tagName === 'SCRIPT' && ! elements[0].src) {
    metroLoaded = true
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@muze-nl/metro/dist/everything.js'
    script.setAttribute('data-js', 'loaded')
    elements.unshift(script)

  }

  const currentElement = elements.shift()

  if (currentElement !== undefined) {
    container.appendChild(currentElement)

    if (currentElement.tagName === 'SCRIPT' && currentElement.src) {
      currentElement.addEventListener('load', () => addElements(container, elements, metroLoaded))
    } else {
      addElements(container, elements, metroLoaded)
    }
  }
}

function createHTML(text) {
  const elements = []
  const range = document.createRange()

  const fragment = range.createContextualFragment(text)

  fragment.childNodes.forEach(element => {
    if (element.nodeType === 3 && element.textContent.trim() === '') {
      element.remove()
    }
  })

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