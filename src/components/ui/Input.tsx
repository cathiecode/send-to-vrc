import styled from "@emotion/styled";

const Input = styled.input`
  padding: 0.5em;
  border: solid 1px #ccc;
  border-bottom: solid 2px #999;
  padding-bottom: calc(1px + 0.5em);
  border-radius: 0.25em;
  position: relative;

  &:focus-visible {
    outline: none;
    padding-bottom: 0.5em;
    border-bottom: solid 3px rgba(24, 105, 205, 1);
  }
`;

export default Input;
