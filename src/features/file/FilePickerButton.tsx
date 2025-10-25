import useFilePickerDialog from "@/hooks/useFilePickerDialog";

type FilePickerButtonProps = {
  onFilePicked?: (path: string | undefined) => void;
};

export default function FilePickerButton(props: FilePickerButtonProps) {
  const { onFilePicked } = props;

  const onOpenClicked = useFilePickerDialog(onFilePicked);

  return <button onClick={onOpenClicked}>Open</button>;
}
