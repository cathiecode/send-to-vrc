type ErrorComponentProps = {
  error: unknown;
};

export default function ErrorComponent(props: ErrorComponentProps) {
  const { error } = props;

  return (
    <div>
      <h1>エラーが発生しました</h1>
      Send to VRCの実行中に復帰不可能なエラーが発生しました。
      <div>
        まずは: <button>アプリケーションを再読み込みする</button>
      </div>
      <div>
        直らなかったら: <a href="/recovery.html">リカバリページに移動する</a>
      </div>
      <h2>エラー</h2>
      <pre>{`${error}`}</pre>
    </div>
  );
}
