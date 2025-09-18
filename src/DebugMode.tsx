import FilePickerComponent from "./FilePickerComponent";

export default function DebugMode() {
  return <div>
    <FilePickerComponent pickedFileValidity="pending" pickedFilePath="C:\path\to\file.png" />
    <FilePickerComponent pickedFileValidity="valid" pickedFilePath="C:\path\to\file.png" />
    <FilePickerComponent pickedFileValidity="invalid" pickedFilePath="C:\path\to\file.png" />
  </div>
}