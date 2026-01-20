"use client";

import React from "react";
import Image from "next/image";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, FileText, FileSpreadsheet, FileImage, File as FileIcon, Loader2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import type { PendingAttachment } from "@/types/attachment";

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border-none bg-transparent px-3 py-3 text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px] resize-none scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// Tooltip Components
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Dialog Components
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-secondary/80 p-2 hover:bg-secondary transition-all">
        <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-foreground hover:bg-foreground/80 text-background",
      outline: "border border-border bg-transparent hover:bg-secondary",
      ghost: "bg-transparent hover:bg-secondary",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// VoiceRecorder Component
interface VoiceRecorderProps {
  isRecording: boolean;
  recordingTime: number;
  visualizerData: number[];
  transcript: string;
  interimTranscript: string;
  error: string | null;
}
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  recordingTime,
  visualizerData,
  transcript,
  interimTranscript,
  error,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const combinedTranscript = transcript + interimTranscript;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="font-mono text-sm text-foreground/80">{formatTime(recordingTime)}</span>
      </div>

      {/* Real-time audio visualization */}
      <div className="w-full h-16 flex items-center justify-center gap-0.5 px-4 mb-2">
        {visualizerData.map((value, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-primary transition-all duration-100 ease-out"
            style={{
              height: `${Math.max(15, value * 100)}%`,
              opacity: Math.max(0.3, value),
            }}
          />
        ))}
      </div>

      {/* Real-time transcript display */}
      {combinedTranscript && (
        <div className="w-full px-4 mt-2">
          <p className="text-sm text-foreground/70 text-center">
            {transcript}
            <span className="text-foreground/50">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="w-full px-4 mt-2">
          <p className="text-xs text-destructive text-center">{error}</p>
        </div>
      )}
    </div>
  );
};

// ImageViewDialog Component
interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}
const ImageViewDialog: React.FC<ImageViewDialogProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-card rounded-2xl overflow-hidden shadow-2xl"
        >
          <Image
            src={imageUrl}
            alt="Full preview"
            width={800}
            height={600}
            className="w-full max-h-[80vh] object-contain rounded-2xl"
            unoptimized
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});
function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
}

interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };
    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          <div
            ref={ref}
            className={cn(
              "rounded-3xl border border-border bg-card p-2 shadow-lg transition-all duration-300",
              className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  }
);
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
}
const PromptInputTextarea: React.FC<PromptInputTextareaProps & React.ComponentProps<typeof Textarea>> = ({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  ...props
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};

const PromptInputActions: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}
const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

// Main PromptInputBox Component
interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  // External attachment state (when using useAttachments hook)
  pendingAttachments?: PendingAttachment[];
  onAddFiles?: (files: File[]) => void;
  onRemoveFile?: (id: string) => void;
  onRetryFile?: (id: string) => void;
  isUploading?: boolean;
  isProcessing?: boolean;
  getValidationError?: (file: File) => string | null;
  isAllowedFile?: (file: File) => boolean;
  canAddMoreFiles?: boolean;
}
export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
  const {
    onSend = () => {},
    isLoading = false,
    placeholder = "Type your message here...",
    className,
    // External attachment props
    pendingAttachments,
    onAddFiles,
    onRemoveFile,
    onRetryFile,
    isUploading: _isUploading = false,
    isProcessing: _isProcessing = false,
    getValidationError: _externalGetValidationError,
    isAllowedFile: externalIsAllowedFile,
    canAddMoreFiles: _canAddMoreFiles = true,
  } = props;

  const [input, setInput] = React.useState("");
  // Internal file state (used when no external attachment props provided)
  const [internalFiles, setInternalFiles] = React.useState<File[]>([]);
  const [filePreviews, setFilePreviews] = React.useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const promptBoxRef = React.useRef<HTMLDivElement>(null);

  // Determine if we're using external attachment management
  const useExternalAttachments = pendingAttachments !== undefined;

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return FileImage;
    if (file.type.includes("pdf")) return FileText;
    if (file.type.includes("spreadsheet") || file.type.includes("excel") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) return FileSpreadsheet;
    if (file.type.includes("document") || file.type.includes("word") || file.name.endsWith(".docx") || file.name.endsWith(".doc")) return FileText;
    if (file.type.includes("presentation") || file.type.includes("powerpoint") || file.name.endsWith(".pptx") || file.name.endsWith(".ppt")) return FileText;
    return FileIcon;
  };

  const internalIsAllowedFile = (file: File) => {
    const allowedTypes = [
      'image/',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

    return allowedTypes.some(type => file.type.startsWith(type)) ||
           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  // Use external validation if provided, otherwise use internal
  const isAllowedFile = externalIsAllowedFile || internalIsAllowedFile;

  const processFile = React.useCallback((file: File) => {
    if (!isAllowedFile(file)) {
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      return;
    }

    // Use external handler if available
    if (useExternalAttachments && onAddFiles) {
      onAddFiles([file]);
      return;
    }

    // Otherwise use internal state
    setInternalFiles(prev => [...prev, file]);

    // Only create preview for images (for internal mode)
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreviews(prev => ({ ...prev, [file.name]: e.target?.result as string }));
      reader.readAsDataURL(file);
    }
  }, [isAllowedFile, useExternalAttachments, onAddFiles]);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(file => processFile(file));
  }, [processFile]);

  // Handle remove file - supports both external (by ID) and internal (by index) modes
  const handleRemoveFile = (indexOrId: number | string) => {
    if (useExternalAttachments && onRemoveFile && typeof indexOrId === 'string') {
      onRemoveFile(indexOrId);
      return;
    }

    // Internal mode - remove by index
    const index = typeof indexOrId === 'number' ? indexOrId : parseInt(indexOrId, 10);
    const fileToRemove = internalFiles[index];

    // Remove file from array
    setInternalFiles(prev => prev.filter((_, i) => i !== index));

    // Remove preview if it exists
    if (fileToRemove && filePreviews[fileToRemove.name]) {
      setFilePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[fileToRemove.name];
        return newPreviews;
      });
    }
  };

  const openImageModal = (imageUrl: string) => setSelectedImage(imageUrl);

  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  }, [processFile]);

  React.useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Speech recognition hook
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: 'pt-BR',
    continuous: true,
    interimResults: true,
  });

  // Audio recorder hook
  const {
    recordingTime,
    visualizerData,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    error: audioError,
  } = useAudioRecorder();

  const handleSubmit = () => {
    const hasFiles = useExternalAttachments
      ? (pendingAttachments?.length ?? 0) > 0
      : internalFiles.length > 0;

    if (input.trim() || hasFiles) {
      const formattedInput = input;

      // For external mode, don't pass files (they're already managed externally)
      // For internal mode, pass the files array
      onSend(formattedInput, useExternalAttachments ? undefined : internalFiles);
      setInput("");

      // Only clear internal state
      if (!useExternalAttachments) {
        setInternalFiles([]);
        setFilePreviews({});
      }
    }
  };

  const handleStartRecording = async () => {
    if (!isSpeechSupported) {
      console.error('Reconhecimento de voz não é suportado neste navegador');
      return;
    }

    try {
      // Reset previous transcript
      resetTranscript();

      // Start audio recording for visualization
      await startAudioRecording();

      // Start speech recognition
      startListening();

      setIsRecording(true);
    } catch (error) {
      console.error('Falha ao iniciar gravação:', error);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    // Stop audio recording
    stopAudioRecording();

    // Stop speech recognition
    stopListening();

    // Insert transcript into input field
    if (transcript.trim()) {
      setInput(transcript.trim());
    }

    setIsRecording(false);
  };

  // Auto-finalize recording when speech recognition stops
  React.useEffect(() => {
    // If speech recognition stopped while we were recording and have transcript
    if (!isListening && isRecording && transcript.trim()) {
      // Stop audio recording
      stopAudioRecording();

      // Insert transcript into input field
      setInput(transcript.trim());

      setIsRecording(false);
    }
  }, [isListening, isRecording, transcript, stopAudioRecording]);

  const hasFiles = useExternalAttachments
    ? (pendingAttachments?.length ?? 0) > 0
    : internalFiles.length > 0;
  const hasContent = input.trim() !== "" || hasFiles;
  const recordingError = speechError || audioError;

  // Check if there are any files uploading or processing (blocking send)
  const _hasBlockingFiles = useExternalAttachments && pendingAttachments?.some(
    a => a.status === 'uploading' || a.status === 'processing'
  );

  // Check if there are any failed files
  const _hasErrorFiles = useExternalAttachments && pendingAttachments?.some(
    a => a.status === 'error'
  );

  // Unused variables kept for future UI enhancements
  void _isUploading;
  void _isProcessing;
  void _externalGetValidationError;
  void _canAddMoreFiles;
  void _hasBlockingFiles;
  void _hasErrorFiles;

  return (
    <>
      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        className={cn(
          "w-full bg-card border-border shadow-lg transition-all duration-300 ease-in-out",
          isRecording && "border-destructive/70",
          className
        )}
        disabled={isLoading || isRecording}
        ref={ref || promptBoxRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File previews - External mode with PendingAttachments */}
        {useExternalAttachments && pendingAttachments && pendingAttachments.length > 0 && !isRecording && (
          <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
            {pendingAttachments.map((attachment) => {
              const FileIconComponent = getFileIcon(attachment.file);
              const isImage = isImageFile(attachment.file);
              const preview = attachment.preview;
              const isError = attachment.status === 'error';
              const isUploading = attachment.status === 'uploading';
              const isProcessingFile = attachment.status === 'processing';
              const isProcessed = attachment.status === 'processed';

              return (
                <div key={attachment.id} className="relative group">
                  {isImage && preview ? (
                    <div
                      className={cn(
                        "w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 relative",
                        isError && "ring-2 ring-destructive",
                        isProcessed && "ring-2 ring-green-500"
                      )}
                      onClick={() => !isError && openImageModal(preview)}
                    >
                      <Image
                        src={preview}
                        alt={attachment.file.name}
                        width={64}
                        height={64}
                        className={cn(
                          "h-full w-full object-cover",
                          (isUploading || isProcessingFile) && "opacity-50"
                        )}
                        unoptimized
                      />
                      {/* Upload progress overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60">
                          <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${attachment.uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-foreground mt-1">{attachment.uploadProgress}%</span>
                        </div>
                      )}
                      {/* Processing indicator */}
                      {isProcessingFile && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                      )}
                      {/* Processed checkmark */}
                      {isProcessed && (
                        <div className="absolute bottom-1 right-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      {/* Error indicator */}
                      {isError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        </div>
                      )}
                      {/* Remove/Retry buttons */}
                      <div className="absolute top-1 right-1 flex gap-1">
                        {isError && onRetryFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryFile(attachment.id);
                            }}
                            className="rounded-full bg-background/70 p-0.5 hover:bg-background transition-colors"
                            title="Tentar novamente"
                          >
                            <RotateCcw className="h-3 w-3 text-foreground" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(attachment.id);
                          }}
                          className="rounded-full bg-background/70 p-0.5 hover:bg-background transition-colors"
                        >
                          <X className="h-3 w-3 text-foreground" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2 pr-8 max-w-xs relative",
                      isError && "ring-2 ring-destructive",
                      isProcessed && "ring-2 ring-green-500"
                    )}>
                      {/* File icon or status */}
                      {isUploading || isProcessingFile ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                      ) : isProcessed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : isError ? (
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                      ) : (
                        <FileIconComponent className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-foreground truncate max-w-[150px]" title={attachment.file.name}>
                          {attachment.file.name}
                        </span>
                        {isUploading && (
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${attachment.uploadProgress}%` }}
                            />
                          </div>
                        )}
                        {isError && attachment.error && (
                          <span className="text-[10px] text-destructive truncate">{attachment.error}</span>
                        )}
                      </div>
                      {/* Buttons */}
                      <div className="absolute top-1 right-1 flex gap-1">
                        {isError && onRetryFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryFile(attachment.id);
                            }}
                            className="rounded-full bg-background/70 p-0.5 hover:bg-background transition-colors"
                            title="Tentar novamente"
                          >
                            <RotateCcw className="h-3 w-3 text-foreground" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(attachment.id);
                          }}
                          className="rounded-full bg-background/70 p-0.5 hover:bg-background transition-colors"
                        >
                          <X className="h-3 w-3 text-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* File previews - Internal mode (backward compatibility) */}
        {!useExternalAttachments && internalFiles.length > 0 && !isRecording && (
          <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
            {internalFiles.map((file, index) => {
              const FileIconComponent = getFileIcon(file);
              const isImage = isImageFile(file);

              return (
                <div key={`${file.name}-${index}`} className="relative group">
                  {isImage && filePreviews[file.name] ? (
                    <div
                      className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                      onClick={() => openImageModal(filePreviews[file.name])}
                    >
                      <Image
                        src={filePreviews[file.name]}
                        alt={file.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="absolute top-1 right-1 rounded-full bg-background/70 p-0.5 opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2 pr-8 max-w-xs">
                      <FileIconComponent className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-xs text-foreground truncate max-w-[150px]" title={file.name}>
                        {file.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="absolute top-1 right-1 rounded-full bg-background/70 p-0.5 hover:bg-background transition-colors"
                      >
                        <X className="h-3 w-3 text-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={cn(
            "transition-all duration-300",
            isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100"
          )}
        >
          <PromptInputTextarea
            placeholder={placeholder}
            className="text-lg"
          />
        </div>

        {isRecording && (
          <VoiceRecorder
            isRecording={isRecording}
            recordingTime={recordingTime}
            visualizerData={visualizerData}
            transcript={transcript}
            interimTranscript={interimTranscript}
            error={recordingError}
          />
        )}

        <PromptInputActions className="flex items-center justify-between gap-2 p-0 pt-2">
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity duration-300",
              isRecording ? "opacity-0 invisible h-0" : "opacity-100 visible"
            )}
          >
            <PromptInputAction tooltip="Anexar arquivos (imagens, PDF, Word, Excel, PowerPoint)">
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-8 w-8 text-muted-foreground cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-secondary hover:text-foreground"
                disabled={isRecording}
              >
                <Paperclip className="h-5 w-5 transition-colors" />
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      Array.from(e.target.files).forEach(file => processFile(file));
                    }
                    if (e.target) e.target.value = "";
                  }}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx"
                />
              </button>
            </PromptInputAction>
          </div>

          <PromptInputAction
            tooltip={
              isLoading
                ? "Stop generation"
                : isRecording
                ? "Stop recording"
                : hasContent
                ? "Send message"
                : "Voice message"
            }
          >
            <Button
              variant="default"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-200",
                isRecording
                  ? "bg-transparent hover:bg-secondary text-destructive hover:text-destructive/80"
                  : hasContent
                  ? "bg-foreground hover:bg-foreground/80 text-background"
                  : "bg-transparent hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                if (isRecording) handleStopRecording();
                else if (hasContent) handleSubmit();
                else handleStartRecording();
              }}
              disabled={isLoading && !hasContent}
            >
              {isLoading ? (
                <Square className="h-4 w-4 fill-background animate-pulse" />
              ) : isRecording ? (
                <StopCircle className="h-5 w-5 text-destructive" />
              ) : hasContent ? (
                <ArrowUp className="h-4 w-4 text-background" />
              ) : (
                <Mic className="h-5 w-5 transition-colors" />
              )}
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>

      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
});
PromptInputBox.displayName = "PromptInputBox";
