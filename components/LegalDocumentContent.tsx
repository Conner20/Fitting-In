import type { LegalBlock } from "@/lib/legal-documents";

function Text({ value }: { value: string }) {
  const parts = value.split(/(https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g);
  return <>{parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) return <a key={index} href={part} target="_blank" rel="noreferrer" className="underline">{part}</a>;
    if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part)) return <a key={index} href={`mailto:${part}`} className="underline">{part}</a>;
    return part;
  })}</>;
}

export default function LegalDocumentContent({ blocks }: { blocks: LegalBlock[] }) {
  const sections: React.ReactNode[] = [];
  let current: React.ReactNode[] = [];
  const flush = () => { if (current.length) sections.push(<section key={sections.length} className="space-y-3">{current}</section>); current = []; };
  for (const block of blocks) {
    if (block.type === "document") { flush(); sections.push(<div key={sections.length} className="legal-docx-content space-y-4 [&_a]:underline [&_h2]:!mb-3 [&_h2]:!mt-8 [&_h2]:flex [&_h2]:gap-2 [&_h2]:font-black [&_h2]:text-xl [&_h2]:text-white [&_h3]:mt-6 [&_h3]:font-black [&_h3]:text-white [&_h4]:mt-5 [&_h4]:font-bold [&_h4]:text-white [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:whitespace-pre-wrap [&_strong]:font-bold [&_ul]:space-y-2" dangerouslySetInnerHTML={{ __html: block.html }} />); }
    else if (block.type === "heading") { flush(); current.push(<h2 key="heading"><Text value={block.text} /></h2>); }
    else if (block.type === "paragraph") current.push(<p key={`p-${current.length}`}><Text value={block.text} /></p>);
    else {
      const Tag = block.type === "numbered" ? "ol" : "ul";
      current.push(<Tag key={`l-${current.length}`} className={block.type === "numbered" ? "list-decimal space-y-1 pl-5" : undefined}>{block.items.map((item, index) => <li key={index}><Text value={item} /></li>)}</Tag>);
    }
  }
  flush();
  return <>{sections}</>;
}
