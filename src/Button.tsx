import styled from "@emotion/styled";

const Button = styled.button`
  background-color: rgba(24, 105, 205, 1);
  color: #fff;
  border: solid 1px transparent;
  border-radius: 0.25em;
  padding: 0.5em 1em;

  &:hover,
  &:focus-visible {
    background-color: rgba(61, 121, 195, 1);
  }
`;

export default Button;
