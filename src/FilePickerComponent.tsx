import { Button, Card, Flex, Icon, Spinner } from "@chakra-ui/react";
import { TbAlertCircleFilled, TbCheck } from "react-icons/tb";

type FilePickerComponentProps = {
  pickedFilePath?: string;
  pickedFileValidity: "pending" | "valid" | "invalid";
  onOpenClicked?: () => void;
};
export default function FilePickerComponent(props: FilePickerComponentProps) {
  const { pickedFilePath, onOpenClicked } = props;

  return (
    <Card.Root>
      <Card.Body gap="2">
        <Flex gap="2" justifyContent="space-between" alignItems="center">
          <div>
            {pickedFilePath
              ? `${pickedFilePath}`
              : "ファイルが選択されていません"}
          </div>
          <Button onClick={onOpenClicked}>Open</Button>
        </Flex>
        <div>
          {(() => {
            switch (props.pickedFileValidity) {
              case "pending":
                return (
                  <Flex spaceX="2" alignItems="center" height={"2em"}>
                    <Spinner size="md" />
                    <div>ファイルの有効性を確認しています</div>
                  </Flex>
                );
              case "valid":
                return (
                  <Flex spaceX="2" alignItems="center" height={"2em"}>
                    <Icon name="check-circle" color="green.500">
                      <TbCheck size="2em" />
                    </Icon>
                    <div>ファイルの確認が完了しました</div>
                  </Flex>
                );
              case "invalid":
                return (
                  <Flex spaceX="2" alignItems="center" height={"2em"}>
                    <Icon name="check-circle" color="red.500">
                      <TbAlertCircleFilled size="2em" />
                    </Icon>
                    <div>画像ファイルを読み込めませんでした</div>
                  </Flex>
                );
            }
          })()}
        </div>
      </Card.Body>
    </Card.Root>
  );
}
