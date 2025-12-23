'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css' 

interface Props {
  content: string
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <div className="rounded-md overflow-hidden my-2 border border-gray-700">
                <div className="bg-gray-800 text-gray-300 text-xs px-3 py-1 font-mono">
                  {match[1].toUpperCase()}
                </div>
                <code className={`${className} block bg-[#282c34] p-3 text-white overflow-x-auto`} {...props}>
                  {children}
                </code>
              </div>
            ) : (
              <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded font-mono text-sm" {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}