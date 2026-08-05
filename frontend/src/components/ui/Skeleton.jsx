import React from "react";
import AppSkeleton, { AppTableSkeleton, AppCardSkeleton } from "./AppSkeleton";

const Skeleton = (props) => <AppSkeleton {...props} />;

export default Skeleton;
export {
  AppSkeleton,
  AppTableSkeleton,
  AppTableSkeleton as TableSkeleton,
  AppCardSkeleton,
  AppCardSkeleton as CardSkeleton,
};
