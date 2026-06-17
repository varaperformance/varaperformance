import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function BlogPrismBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  return (
    <SyntaxHighlighter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={oneDark as any}
      language={language}
      PreTag="div"
      className="my-0! text-sm"
      showLineNumbers
    >
      {code}
    </SyntaxHighlighter>
  );
}
