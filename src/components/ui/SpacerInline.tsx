export default function SpacerInline(props: { size?: string }) {
  const { size = "1em" } = props;

  return <div style={{ width: size, display: "inline-block" }} />;
}
