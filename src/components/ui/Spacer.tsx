export function Spacer(props: { size?: string }) {
  const { size = "1em" } = props;

  return <div style={{ height: size }} />;
}
