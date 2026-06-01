"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import type ReactQuillType from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(
  () => import("react-quill-new").then((mod) => mod.default),
  { ssr: false }
) as unknown as React.ForwardRefExoticComponent<
  React.ComponentProps<typeof ReactQuillType> & {
    ref?: React.Ref<ReactQuillType>;
  }
>;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImageUpload?: (
    file: File,
    insertCallback: (url: string) => void
  ) => Promise<boolean>;
  maxImages?: number;
  currentImageCount?: number;
  editorRef?: React.MutableRefObject<any>;
}

let isUpdatingProgrammatically = false;

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write product description...",
  onImageUpload,
  maxImages = 20,
  currentImageCount = 0,
  editorRef,
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const internalQuillRef = useRef<any>(null);
  const quillInstance = editorRef || internalQuillRef;
  const scrollLockRef = useRef(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lockScroll = useCallback(() => {
    if (!scrollLockRef.current) {
      lastScrollYRef.current = window.scrollY;
      scrollLockRef.current = true;
    }
  }, []);

  const restoreScroll = useCallback(() => {
    if (scrollLockRef.current) {
      window.scrollTo({
        top: lastScrollYRef.current,
        behavior: "instant",
      });
      scrollLockRef.current = false;
    }
  }, []);

  const handleChange = useCallback(
    (newValue: string) => {
      if (isUpdatingProgrammatically) return;
      lockScroll();
      onChange(newValue);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoreScroll();
        });
      });
    },
    [onChange, lockScroll, restoreScroll]
  );

  const handleFocus = useCallback(() => {
    lockScroll();
    setTimeout(() => restoreScroll(), 10);
  }, [lockScroll, restoreScroll]);

  const handleBlur = useCallback(() => {
    setTimeout(() => restoreScroll(), 10);
  }, [restoreScroll]);

  // ✅ KEY FIX: image handler - file pick karo, onImageUpload call karo
  // lekin insertCallback (jo Quill mein image daalta hai) ko KABHI execute mat karo
  const imageHandler = useCallback(() => {
    if (!onImageUpload) return;

    const savedScrollY = window.scrollY;
    window.scrollTo({ top: savedScrollY, behavior: "instant" });

    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.style.position = "fixed";
    input.style.top = "-100px";
    input.style.left = "-100px";
    input.style.opacity = "0";
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);

      if (!file) {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
        return;
      }

      window.scrollTo({ top: savedScrollY, behavior: "instant" });
      setIsUploading(true);

      // ✅ FIX: yeh no-op callback hai — Quill mein kuch insert NAHI hoga
      // ProductDescription component mein bhi insertImageCallback call nahi hoti
      // to image SIRF gallery mein jayegi
      const noOpInsertCallback = (_url: string) => {
        // intentionally empty — image Quill mein nahi jayegi
      };

      try {
        await onImageUpload(file, noOpInsertCallback);
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image");
      } finally {
        setIsUploading(false);
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      }
    };

    input.click();
  }, [onImageUpload]);

  // ✅ useMemo use karo taake modules re-create na ho har render pe
  // Vercel pe yeh bahut zaroori hai — nahi toh Quill reinitialize hota rehta hai
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ font: [] }],
          [{ size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ script: "sub" }, { script: "super" }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ align: [] }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [imageHandler]
  );

  const formats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "script",
    "list",
    "indent",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
  ];

  // Global Quill styles
  useEffect(() => {
    if (!isMounted) return;

    const style = document.createElement("style");
    style.innerHTML = `
      .ql-toolbar {
        position: relative;
        z-index: 1000 !important;
      }
      .ql-toolbar button {
        pointer-events: auto !important;
        cursor: pointer !important;
      }
      .ql-bold.ql-active, .ql-italic.ql-active, .ql-underline.ql-active, .ql-strike.ql-active {
        background: rgba(218, 165, 32, 0.2) !important;
        color: #8b6914 !important;
      }
      .ql-picker {
        z-index: 1001 !important;
      }
      .ql-picker-options {
        z-index: 10000 !important;
        background: white !important;
        border: 1px solid rgba(218, 165, 32, 0.2) !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      }
      .ql-picker-item:hover {
        background: rgba(218, 165, 32, 0.1) !important;
        color: #8b6914 !important;
      }
      .ql-editor {
        min-height: 200px;
        font-family: var(--ap-sans, 'Josefin Sans', sans-serif);
        font-size: 0.9rem;
        line-height: 1.6;
      }
      .ql-editor strong, .ql-editor b { font-weight: bold !important; }
      .ql-editor em, .ql-editor i { font-style: italic !important; }
      .ql-editor u { text-decoration: underline !important; }
      .ql-editor s, .ql-editor strike { text-decoration: line-through !important; }
      .ql-editor h1 { font-size: 2rem; font-weight: bold; margin: 0.5rem 0; }
      .ql-editor h2 { font-size: 1.5rem; font-weight: bold; margin: 0.5rem 0; }
      .ql-editor h3 { font-size: 1.25rem; font-weight: bold; margin: 0.5rem 0; }
      .ql-editor ul, .ql-editor ol { padding-left: 1.5rem; margin: 0.5rem 0; }
      .ql-editor li { margin: 0.25rem 0; }
      .ql-editor blockquote {
        border-left: 3px solid #daa520;
        padding-left: 1rem;
        margin: 0.5rem 0;
        color: #666;
        font-style: italic;
      }
      .ql-editor img {
        max-width: 100%;
        border-radius: 8px;
        margin: 0.5rem 0;
      }
      .ql-editor a { color: #daa520; text-decoration: none; }
      .ql-editor a:hover { text-decoration: underline; }
      .ql-color-picker .ql-picker-options {
        width: 200px !important;
        padding: 8px !important;
      }
      .ql-color-picker .ql-picker-item {
        width: 24px !important;
        height: 24px !important;
        margin: 2px !important;
        border-radius: 4px !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [isMounted]);

  // Scroll prevent
  useEffect(() => {
    if (!isMounted || !quillInstance.current) return;

    const editor = quillInstance.current.getEditor();
    if (!editor) return;

    const editorContainer = editor.container;
    if (editorContainer) {
      const originalScrollIntoView = editorContainer.scrollIntoView;
      editorContainer.scrollIntoView = () => {};

      const origSetSelection = editor.setSelection;
      editor.setSelection = (...args: any[]) => {
        const result = origSetSelection.apply(editor, args);
        setTimeout(() => {
          window.scrollTo({ top: lastScrollYRef.current, behavior: "instant" });
        }, 0);
        return result;
      };

      return () => {
        editorContainer.scrollIntoView = originalScrollIntoView;
        editor.setSelection = origSetSelection;
      };
    }
  }, [isMounted, quillInstance]);

  if (!isMounted) {
    return (
      <div className="ap-editor-placeholder">
        <div className="ap-editor-loading">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="ap-rich-editor">
      <ReactQuill
        ref={quillInstance}
        theme="snow"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="ap-quill-editor"
      />
      {isUploading && (
        <div className="ap-uploading-indicator">
          <div className="ap-spinner-small" />
          <span>Uploading to gallery...</span>
        </div>
      )}
      <style jsx>{`
        .ap-rich-editor {
          width: 100%;
          background: #f9f5f0;
          border-radius: 8px;
          overflow: visible;
          position: relative;
          z-index: 1;
        }
        .ap-rich-editor :global(.ql-container) {
          min-height: 200px;
          font-family: var(--ap-sans);
          font-size: 0.9rem;
          z-index: 1;
        }
        .ap-rich-editor :global(.ql-editor) {
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
          background: #ffffff;
          scroll-behavior: auto;
          overscroll-behavior: contain;
          position: relative;
          z-index: 1;
        }
        .ap-rich-editor :global(.ql-editor:focus) {
          outline: none;
          scroll-margin: 0;
        }
        .ap-rich-editor :global(.ql-toolbar) {
          background: rgba(218, 165, 32, 0.05);
          border-color: rgba(218, 165, 32, 0.15);
          position: relative;
          z-index: 1000;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .ap-rich-editor :global(.ql-toolbar button) {
          cursor: pointer;
        }
        .ap-rich-editor :global(.ql-toolbar button:hover) {
          background: rgba(218, 165, 32, 0.1);
        }
        .ap-editor-placeholder {
          width: 100%;
          min-height: 200px;
          background: #ffffff;
          border: 1px solid rgba(218, 165, 32, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ap-editor-loading {
          font-family: var(--ap-sans);
          font-size: 0.8rem;
          color: #999;
        }
        .ap-uploading-indicator {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(218, 165, 32, 0.08);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.6rem;
          color: #8b6914;
        }
        .ap-spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(218, 165, 32, 0.2);
          border-top-color: #daa520;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
