import styled from "@emotion/styled";

const Card = styled.div`
  position: relative;
  display: block;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 0.25em;
  height: 4em; /* 0.75 + 1 + 0.8 + 0.75 */
  line-height: 1em;

  background-color: #fcfcfc;
`;

const CardIcon = styled.div`
  position: absolute;
  left: 1em;
  top: 50%;
  transform: translateY(-50%);
  & > * {
    font-size: 2em;
  }
`;

const CardTitle = styled.div`
  position: absolute;
  top: 1em;
  left: 4em;
`;

const CardDescription = styled.div`
  position: absolute;
  top: 2.5em;
  left: 5em;
  right: 1em;
  color: #666;
  font-size: 0.8em;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  height: 1.2em;
  text-align: left;
`;

const CardAction = styled.div`
  position: absolute;
  top: 50%;
  right: 1em;
  transform: translateY(-50%);
`;

export default Card;
export { CardIcon, CardTitle, CardDescription, CardAction };
