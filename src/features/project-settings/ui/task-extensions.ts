import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";

/** One schema for the editor and the applicant preview: H1, H2, bold, italic, lists, links, images. */
export function taskExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: false,
        protocols: ["mailto", "tel"],
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
      },
    }),
    Image.configure({ inline: false, allowBase64: false }),
  ];
}

/** Typography for editor and preview content, written as Tailwind arbitrary variants (no global CSS). */
export const PROSE =
  "text-[15px] leading-relaxed text-charcoal [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-[28px] [&_h1]:leading-none [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-[21px] [&_h2]:leading-none [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:font-semibold [&_a]:text-blue [&_a]:underline [&_img]:my-2 [&_img]:max-h-64 [&_img]:max-w-full [&_img]:rounded-lg [&_strong]:font-extrabold [&_:first-child]:mt-0";
