from __future__ import annotations
import asyncio
import time
from typing import Any, Callable, Optional
from . import logger
from .universe import Mundus


class IEC61131Exception(Exception):
    """Exception raised when an event exceeds its deadline."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class ExceedWaitingTime(IEC61131Exception):
    """Exception raised when an event exceeds its waiting time."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class ExceedExecutionTime(IEC61131Exception):
    """Exception raised when an event exceeds its execution time."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class ExceedEventDuration(IEC61131Exception):
    """Exception raised when an event exceeds its duration."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class Event:

    def __init__(
        self,
        at: float | Event,
        till: float | Event,
        action: Callable,
        step: None | float = None,
        label: Optional[str] = None,
        once: bool = False,
        priority: int = 0,
        watchdog: Optional[Callable] = None,
    ) -> None:
        """Create an event which happens at a certain time and ends at a certain time.

        Args:
            at (float | Event): when the event should start.
            till (float | Event): when the event should end.
            action (Callable): what happens during the event.
            label (Optional[str], optional): Short description for the event. Defaults to None.
            once (bool, optional): whether this event should only happen once, regardless of at or till. Defaults to False.
            priority (int, optional): the priority of the event, event with lower value will happen before the events with a higher priority value. Defaults to 0.

        Raises:
            ValueError: _description_
        """
        self._at = at
        self._till = till
        self._action = action
        self._started = False
        self._acted = False
        self._ended = False
        self._paused = False
        self._cancelled = False
        self._label = label
        self._once = once
        self._priority = priority
        if step is None:
            self._step = Mundus.time_step
            self._besteffort = True
        else:
            self._step = step
            self._besteffort = False
        self._watchdog = watchdog if watchdog else lambda: self.cancel()
        self._next = 0
        Mundus.pending_events.append(self)
        if self.priority > Mundus.max_event_priority:
            Mundus._max_event_priority = self.priority

    async def __call__(self) -> Any:
        """Make the event callable, so it can be awaited like a coroutine."""
        while True:
            try:
                if self.ended == True or self.cancelled == True:
                    return

                while True:
                    if self.priority == Mundus.current_event_priority:
                        break
                    else:
                        await asyncio.sleep(0)

                if self.started == False:
                    if isinstance(self.at, Event):
                        if self.at.ended == True:
                            self._started = True
                            self._next = Mundus.time
                            logger.debug(f"Event {self} started at {Mundus.time}.")
                    else:
                        if self.at <= Mundus.time:
                            self._started = True
                            self._next = Mundus.time
                            logger.debug(f"Event {self} started at {Mundus.time}.")

                if (
                    self.started == True
                    and self.ended == False
                    and self.cancelled == False
                    and self.paused == False
                    and self.next <= Mundus.time
                ):
                    # Following IEC 61131 -3, if a event exceeded its deadline, it should be logged and not executed further. Real-time mode only.
                    _waiting_duration = Mundus.time - self.next
                    if not self.besteffort and _waiting_duration > self.step:
                        logger.warning(
                            f"Event {self} waiting time exceeded deadline by {_waiting_duration-self.step} seconds."
                        )
                        if self.watchdog is not None:
                            self.watchdog()
                        raise ExceedWaitingTime(
                            f"Event {self} waiting time exceeded deadline by {_waiting_duration-self.step} seconds."
                        )

                    # Execute the event
                    _execution_start_time = time.perf_counter()
                    if asyncio.iscoroutinefunction(self._action):
                        await self._action()
                    else:
                        await asyncio.to_thread(self._action)
                    _execution_end_time = time.perf_counter()
                    _execution_duration = _execution_end_time - _execution_start_time
                    # Following IEC 61131 -3, if a event exceeded its execution time, it should be logged and not executed further. Real-time mode only.
                    if not self.besteffort and _execution_duration > self.step:
                        logger.error(
                            f"Event {self} execution exceeded deadline by {_execution_duration-self.step} seconds."
                        )
                        if self.watchdog is not None:
                            self.watchdog()
                        raise ExceedExecutionTime(
                            f"Event {self} execution exceeded deadline by {_execution_duration-self.step} seconds."
                        )

                    # Following IEC 61131 -3, if a event exceeded its duration, it should be logged and not executed further. Real-time mode only.
                    _event_duration = _waiting_duration + _execution_duration
                    if not self.besteffort and _event_duration > self.step:
                        logger.error(
                            f"Event {self} exceeded deadline by {_event_duration-self.step} seconds."
                        )
                        if self.watchdog is not None:
                            self.watchdog()
                        raise ExceedEventDuration(
                            f"Event {self} exceeded deadline by {_event_duration-self.step} seconds."
                        )

                    # Update the next time the event should act
                    self._acted = True
                    if Mundus.realtime:
                        if self.besteffort:
                            self._next = Mundus.time
                        else:
                            self._next = round(
                                Mundus.time + self.step,
                                Mundus.time_resolution,
                            )
                    else:
                        self._next += max(Mundus.time_step, self.step)
                        self._next = round(self._next, Mundus.time_resolution)
                    logger.debug(f"Event {self} acted at {Mundus.time}.")

                    # If the event should only happen once, mark it as ended
                    if self._once == True:
                        self._ended = True
                        logger.debug(f"Event {self} ended at {Mundus.time}.")
                        return

                # Set the event as ended if it has a till time and it is reached, or its ending event has ended
                if self.ended == False:
                    if isinstance(self.till, Event):
                        if self.till.ended == True:
                            self._ended = True
                            logger.debug(f"Event {self} ended at {Mundus.time}.")
                            return
                    else:
                        if self.till <= Mundus.time:
                            self._ended = True
                            logger.debug(f"Event {self} ended at {Mundus.time}.")
                            return
                # return control to the event loop
                await asyncio.sleep(0)
            except ExceedWaitingTime as e:
                await asyncio.sleep(0)
            except ExceedExecutionTime as e:
                await asyncio.sleep(0)
            except ExceedEventDuration as e:
                await asyncio.sleep(0)

    def __str__(self) -> str:
        """Return the label of the event if it has one, otherwise return the id of the event."""
        if self.label is None:
            return f"Event {id(self)}"
        return self.label

    def end(self):
        """End the event."""
        self._ended = True
        logger.debug(f"Event {self} ended.")

    def cancel(self):
        """Cancel the event."""
        self._cancelled = True
        logger.debug(f"Event {self} cancelled.")

    def pause(self):
        """Pause the event."""
        self._paused = True
        logger.debug(f"Event {self} paused.")

    def resume(self):
        """Resume the event."""
        self._paused = False
        self._next = Mundus.time
        logger.debug(f"Event {self} resumed.")

    @property
    def at(self):
        """Return the time when the event should start."""
        return self._at

    @property
    def till(self):
        """Return the time when the event should end."""
        return self._till

    @property
    def started(self):
        """Return whether the event has started or not."""
        return self._started

    @property
    def ended(self):
        """Return whether the event has ended or not."""
        return self._ended

    @property
    def cancelled(self):
        """Return whether the event has been cancelled or not."""
        return self._cancelled

    @property
    def paused(self):
        """Return whether the event is paused or not."""
        return self._paused

    @property
    def label(self):
        """Return the label of the event."""
        return self._label

    @property
    def once(self):
        """Return whether the event should only happen once or not."""
        return self._once

    @property
    def priority(self):
        """Return the priority of the event."""
        return self._priority

    @property
    def next(self):
        """Return the next time the event acts."""
        return self._next

    @property
    def step(self):
        """Return the time step of the event, which overwrites the simulation time step."""
        return self._step

    @property
    def watchdog(self):
        """Return the watchdog of the event, which is a function that is called when the event exceeds its deadline in real-time mode."""
        return self._watchdog

    @property
    def besteffort(self) -> bool:
        """Returns true if the event is set as best-effort"""
        return self._besteffort


def event(
    at: float | Event,
    till: float | Event,
    step: float | None = None,
    label: Optional[str] = None,
    once: bool = False,
    priority: int = 0,
    watchdog: Optional[Callable] = None,
):
    def _event(action: Callable) -> Event:
        return Event(
            at=at,
            till=till,
            step=step,
            action=action,
            label=label,
            once=once,
            priority=priority,
            watchdog=watchdog,
        )

    return _event
