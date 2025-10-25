import ImageFilePickerComponent from "./ImageFilePickerComponent";
import useFilePickerDialog from "@/hooks/useFilePickerDialog";

type ImageFilePickerProps = {
  imageSrc?: string;
  pickedFilePath?: string;
  pickedFileValidity: "pending" | "valid" | "invalid";
  height: string;
  maxWidth?: string;
  readonly?: boolean;
  onFilePicked?: (path: string | undefined) => void;
};

export default function ImageFilePicker(props: ImageFilePickerProps) {
  const { onFilePicked, ...baseProps } = props;

  const filePickerDialog = useFilePickerDialog(onFilePicked);

  return (
    <ImageFilePickerComponent onOpenClicked={filePickerDialog} {...baseProps} />
  );
}
