"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionState } from "@/lib/validations";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Wraps useActionState but submits via onSubmit instead of the form `action`
 * prop. React 19 resets forms after an action completes, which would wipe what
 * the user typed when validation fails; this keeps their input intact.
 */
export function useFormAction(action: FormAction, initialState: ActionState) {
  const [state, dispatch, pending] = useActionState(action, initialState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, onSubmit, pending };
}
