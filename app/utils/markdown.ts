import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

export function renderMarkdown(markdownSource: string) {
  return markdown.render(markdownSource)
}
