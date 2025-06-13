from __future__ import annotations

import asyncio
import logging
import time
from typing import TYPE_CHECKING, List

from . import logger

if TYPE_CHECKING:
    from .event import Event


class Universe:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        """The simulation universe."""
        self._time_resolution = 3
        self._time_step = round(1 / pow(10, self.time_resolution), self.time_resolution)
        self._time = 0
        self._simulation_start_time = 0
        self._simulation_end_time = 0
        self._realtime = False
        self._current_event_priority = 0
        self._max_event_priority = 0
        self._pending_events: List[Event] = list()
        self._paused = False

    def simulate(self, till: float):
        """Simulate the universe until the given time."""

        async def _start_pending_events():
            if len(self.pending_events) != 0:
                for event in self.pending_events:
                    asyncio.create_task(event())
                self.pending_events.clear()

        # Define the flow of time
        async def time_flow():
            """Flow of time."""
            logger.info(f"Simulation started...")
            self._simulation_start_time = time.perf_counter()
            while self.time < till:
                if self.paused:
                    await asyncio.sleep(0)
                    continue
                logger.debug(f"Simulation time:\t{self.time}")
                await _start_pending_events()
                if self.realtime:
                    iteration_start_time = (
                        time.perf_counter() - self.simulation_start_time
                    )
                    logger.debug(
                        f"Iteration started at Real Time: {iteration_start_time:0.6f}"
                    )
                    # iterate through all event priorities
                    self._current_event_priority = 0
                    while self.current_event_priority <= self._max_event_priority:
                        logger.debug(
                            f"Current Event Priority: {self.current_event_priority}"
                        )
                        await asyncio.sleep(0)
                        self._current_event_priority += 1
                    # finish the iteration
                    iteration_end_time = (
                        time.perf_counter() - self.simulation_start_time
                    )
                    logger.debug(
                        f"Iteration finished at Real Time: {iteration_end_time:0.6f}"
                    )
                    logger.debug(
                        f"FPS: {1/(iteration_end_time - iteration_start_time):0.6f}"
                    )
                    logger.debug(f"Completion: {(self.time/till)*100:0.2f}%")
                    await asyncio.sleep(0)

                else:
                    # iterate through all event priorities
                    self._current_event_priority = 0
                    while self.current_event_priority <= self._max_event_priority:
                        logger.debug(
                            f"Current Event Priority: {self.current_event_priority}"
                        )
                        await asyncio.sleep(0)
                        self._current_event_priority += 1
                    # wait for the time step
                    self._time += self.time_step
                    self._time = round(self.time, self.time_resolution)
                    logger.debug(f"Completion: {(self.time/till)*100:0.2f}%")
                    await asyncio.sleep(0)

            self._simulation_end_time = time.perf_counter()
            logger.debug(f"Simulation finished in {self._simulation_end_time - self._simulation_start_time}s")
            logger.info(f"Simulation completed.")

        return time_flow()

    def enable_realtime(self):
        """Enable the real time simulation."""
        self._realtime = True

    def disable_realtime(self):
        """Disable the real time simulation."""
        self._realtime = False

    def pause(self):
        """Pause the simulation."""
        if self.paused:
            logger.warning("Simulation is already paused.")
            return
        self._paused = True
        logger.debug(f"Simulation paused at {self.time}.")

    def resume(self):
        """Resume the simulation."""
        if not self.paused:
            logger.warning("Simulation is already running.")
            return
        self._paused = False
        logger.debug(f"Simulation resumed at {self.time}.")

    def set_logging_level(self, level: int = logging.DEBUG):
        """Set the logging level. Default is DEBUG."""
        logger.setLevel(level)

    @property
    def time(self):
        """Return the current time."""
        if Mundus.realtime:
            return time.perf_counter() - self._simulation_start_time
        else:
            return self._time

    @property
    def time_resolution(self):
        """Return the time resolution. 1 for 0.1s, 2 for 0.01s, 3 for 0.001s, and so on. Default is 3."""
        if self._time_resolution < 0:
            raise ValueError("Time resolution cannot be less than 0.")
        return self._time_resolution

    @time_resolution.setter
    def time_resolution(self, value: int):
        """Set the time resolution. 1 for 0.1s, 2 for 0.01s, 3 for 0.001s, and so on. Default is 3."""
        if value < 0:
            raise ValueError("Time resolution cannot be less than 0.")
        self._time_resolution = value
        self._time_step = round(1 / pow(10, self.time_resolution), self.time_resolution)

    @property
    def time_step(self):
        """The time step of the simulation. Default is 0.001s."""
        return self._time_step

    @property
    def realtime(self):
        """Return True if the simulation is in real time mode, otherwise False. Default is False."""
        return self._realtime

    @property
    def pending_events(self):
        """The events that are pending to be executed. Please note that this is not the queue for future events. This is used for start async tasks for the events."""
        return self._pending_events

    @property
    def current_event_priority(self):
        """The current event priority."""
        return self._current_event_priority

    @property
    def max_event_priority(self):
        """The maximum event priority."""
        return self._max_event_priority

    @property
    def simulation_start_time(self):
        """The time when the simulation started."""
        return self._simulation_start_time

    @property
    def simulation_end_time(self):
        """The time when the simulation ended."""
        return self._simulation_end_time

    @property
    def paused(self):
        """Return True if the simulation is paused, otherwise False."""
        return self._paused


Mundus = Universe()
