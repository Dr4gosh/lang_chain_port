import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "About me",
  description: "My description page with everything personal about me",
};

export default function Page() {
  return (
    <div>
      Tehnologii cu care lucrez:
      <p>React, Typescript, VueJs, Javascript</p>
    </div>
  );
}
