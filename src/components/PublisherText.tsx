import React, { Fragment } from "react";
import { publisherTextParts } from "../lib/publisherText.js";

export default function PublisherText({ text }: { text: string }) {
  return (
    <>
      {publisherTextParts(text).map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <wbr />}
          {part}
        </Fragment>
      ))}
    </>
  );
}
