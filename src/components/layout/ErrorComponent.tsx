type ErrorComponentProps = {
  error: unknown;
};

export default function ErrorComponent(props: ErrorComponentProps) {
  const { error } = props;

  return (
    <div>
      <h1>エラーが発生しました Something went wrong!</h1>
      Send to VRCの実行中に復帰不可能なエラーが発生しました。 An unrecoverable
      error occurred while running Send to VRC.
      <div>
        まずは: <button>アプリケーションを再読み込みする</button>
      </div>
      <div>
        直らなかったら(Does not work?):
        <a href="/recovery.html">
          リカバリページに移動する Navigate to recovery page
        </a>
      </div>
      <h2>エラー(Error)</h2>
      <pre>{`${error}`}</pre>
    </div>
  );
}
