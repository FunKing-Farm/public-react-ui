import React, { useReducer, createContext, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const TournamentSchema = z.object({
    name: z.string().min(1),
    type: z.enum(["Individual", "Team"]),
    style: z.enum(["Single Elimination", "Round Robin"]),
    maxRounds: z.number().int().min(1).optional(),
});

type TournamentForm = z.infer<typeof TournamentSchema>;

interface Contestant {
    id: string;
    name: string;
    wins: number;
    losses: number;
}

type Player = {
    id: string;
    name: string;
    teamId?: string;
    wins: number;
    losses: number;
    notes?: string;
};

type Team = {
    id: string;
    name: string;
    playerIds: string[];
    wins: number;
    losses: number;
    notes?: string;
};

type Match = {
    id: string;
    contestant1Id: string;
    contestant2Id: string;
    winnerId?: string;
    contestant1Score?: string;
    contestant2Score?: string;
    notes?: string;
};

type Round = { id: string; matches: Match[] };

type State = {
    phase: "setup" | "contestants" | "running" | "completed";
    tournament: TournamentForm;
    players: Player[];
    teams: Team[];
    rounds: Round[];
    standings: { id: string; wins: number; losses: number }[];
};

type Action =
    | { type: "SETUP" }
    | { type: "SET_TOURNAMENT"; payload: TournamentForm }
    | { type: "ADD_PLAYER"; payload: Player }
    | { type: "ADD_TEAM"; payload: Team }
    | { type: "UPDATE_PLAYER"; payload: Player }
    | { type: "REMOVE_PLAYER"; payload: { id: string } }
    | { type: "REMOVE_TEAM"; payload: { id: string } }
    | { type: "START_TOURNAMENT" }
    | { type: "UPDATE_MATCH"; payload: { roundId: string; match: Match } }
    | { type: "COMPLETE_ROUND" }
    | { type: "END_TOURNAMENT" };

const initialState: State = {
    phase: "setup",
    tournament: { name: "", type: "Individual", style: "Single Elimination" },
    players: [],
    teams: [],
    rounds: [],
    standings: [],
};

const TournamentContext = createContext<{
    state: State;
    dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => null });

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case "SETUP":
            return { ...initialState };
        case "SET_TOURNAMENT":
            return { ...state, tournament: action.payload, phase: "contestants" };
        case "ADD_PLAYER":
            return { ...state, players: [...state.players, action.payload] };
        case "ADD_TEAM":
            return { ...state, teams: [...state.teams, action.payload] };
        case "UPDATE_PLAYER":
            { const oldPlayer = state.players.find((p) => p.id === action.payload.id);
            if (oldPlayer) {
                if (oldPlayer.teamId !== action.payload.teamId) {
                    const oldTeam = state.teams.find((t) => t.id === oldPlayer?.teamId);
                    if (oldTeam) {
                        oldTeam.playerIds = cutFromArray(oldTeam.playerIds, oldPlayer?.id);
                    }
                }
            }
            return {
                ...state,
                players: state.players.map((p) =>
                    p.id === action.payload.id ? action.payload : p
                ),
                teams: state.teams.map((t) =>
                    action.payload.teamId && action.payload.teamId === t.id
                        ? { ...t, playerIds: [...t.playerIds, action.payload.id] }
                        : t
                ),
            }; }
        case "REMOVE_PLAYER":
            { const updatedTeams = state.teams.filter((t) =>
                t.playerIds.includes(action.payload.id)
            );
            updatedTeams.forEach((ut) => {
                ut.playerIds = cutFromArray(ut.playerIds, action.payload.id);
            });
            return {
                ...state,
                players: state.players.filter((p) => p.id !== action.payload.id),
            }; }
        case "REMOVE_TEAM":
            { const updatedPlayers = state.players.map((p) =>
                p.teamId === action.payload.id ? { ...p, teamId: undefined } : p
            );
            return {
                ...state,
                players: updatedPlayers,
                teams: state.teams.filter((t) => t.id !== action.payload.id),
            }; }
        case "START_TOURNAMENT": {
            const actRounds = calcTotalRounds(state);
            const standings = calculateStandings(state);
            const firstRound = generateRound({ ...state, standings });
            return {
                ...state,
                tournament: {
                    ...state.tournament,
                    maxRounds: actRounds,
                },
                phase: "running",
                rounds: [firstRound],
            };
        }
        case "UPDATE_MATCH": {
            const rounds = state.rounds.map((r) =>
                r.id === action.payload.roundId
                    ? {
                        ...r,
                        matches: r.matches.map((m) =>
                            m.id === action.payload.match.id ? action.payload.match : m
                        ),
                    }
                    : r
            );
            return { ...state, rounds };
        }
        case "COMPLETE_ROUND": {
            const standings = calculateStandings(state);
            const isComplete = checkTournamentCompletion(state);
            if (isComplete) return { ...state, phase: "completed", standings };
            const nextRound = generateRound({ ...state, standings });
            return { ...state, rounds: [...state.rounds, nextRound] };
        }
        default:
            return state;
    }
};

const getRandomInt = (max: number): number => {
    return Math.floor(Math.random() * max);
};

const shuffleArray = (array: (Team|Player)[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const getNewId = (addition: string = ""): string => {
    return `${getRandomInt(100)}-${Date.now().toString()}-${addition}`;
};

const cutFromArray = (myArray: any[], key: any): any[] => {
    const index = myArray.indexOf(key);
    if (index > -1) {
        myArray.splice(index, 1);
    }
    return myArray;
};

const getEntityName = (
    state: State,
    id: string,
    type: TournamentForm["type"] = "Individual"
) => {
    if (id === "BYE") {
        return id;
    }
    if (type === "Team") {
        const entity = state.teams.find((t1) => t1.id === id);
        return entity?.name;
    } else {
        const entity = state.players.find((p1) => p1.id === id);
        return entity?.name;
    }
};

const calcTotalRounds = (state: State): number => {
    const { tournament, players, teams } = state;
    const entities: Contestant[] =
        tournament?.type === "Individual"
            ? Object.values(players)
            : Object.values(teams);
    if (tournament?.style === "Round Robin") {
        return tournament.maxRounds
            ? tournament.maxRounds < entities.length - 1
                ? tournament.maxRounds
                : entities.length - 1
            : entities.length - 1;
    } else {
        let remaining = entities.length;
        let roundCounter = 0;
        while (remaining >= 2) {
            if (remaining % 2 > 0) {
                remaining++;
            }
            remaining = remaining / 2;
            roundCounter++;
        }
        return roundCounter;
    }
};

const generateRound = (state: State): Round => {
    const { tournament, players, teams, rounds, standings } = state;
    const entities: Contestant[] =
        tournament?.type === "Individual"
            ? shuffleArray(Object.values(players)).sort((a, b) => a.wins - b.wins)
            : shuffleArray(Object.values(teams)).sort((a, b) => a.wins - b.wins);
    const roundMatches: Match[] = [];
    let remainingContestants: Contestant[] =
        state.tournament.style === "Single Elimination"
            ? entities.filter((e) =>
                standings.some((stat) => stat.id === e.id && stat.losses <= 0)
            )
            : [...entities];
    if (remainingContestants.length % 2 > 0) {
        remainingContestants.push({ id: "BYE", name: "BYE", wins: 0, losses: 0 });
    }
    let failsafe = entities.length * 2;
    while (remainingContestants.length > 0 && failsafe > 0) {
        const currentContestant = remainingContestants.pop();
        const exclude: Contestant[] = [];
        if (currentContestant) {
            remainingContestants.forEach((rc) => {
                if (
                    rounds.some((round) =>
                        round.matches.some(
                            (match) =>
                                (match.contestant1Id === currentContestant?.id &&
                                    rc.id === match.contestant2Id) ||
                                (match.contestant2Id === currentContestant?.id &&
                                    rc.id === match.contestant1Id)
                        )
                    )
                ) {
                    exclude.push(rc);
                }
            });
            const opponent = remainingContestants
                .filter((rc) => !exclude.includes(rc))
                .pop();
            if (opponent) {
                remainingContestants = cutFromArray(remainingContestants, opponent);
                roundMatches.push({
                    id: getNewId("match"),
                    contestant1Id: opponent.id,
                    contestant2Id: currentContestant.id,
                    winnerId:
                        opponent.id === "BYE"
                            ? currentContestant.id
                            : currentContestant.id === "BYE"
                                ? opponent.id
                                : undefined,
                });
            } else {
                remainingContestants.push(currentContestant);
            }
        }
        failsafe--;
    }
    if (remainingContestants.length > 0) {
        return generateRound(state);
    }
    return { id: getNewId("round"), matches: roundMatches };
};

const calculateStandings = (state: State) => {
    const standings = state[
        state.tournament?.type === "Team" ? "teams" : "players"
    ].map((e) => ({
        id: e.id,
        wins: 0,
        losses: 0,
    }));
    state.rounds.forEach((r) => {
        r.matches.forEach((m) => {
            if (m.winnerId) {
                const winner = standings.find((s) => s.id === m.winnerId);
                const loserId =
                    m.winnerId === m.contestant1Id ? m.contestant2Id : m.contestant1Id;
                const loser = standings.find((s) => s.id === loserId);
                if (winner) {
                    winner.wins++;
                }
                if (loser) {
                    loser.losses++;
                }
            }
        });
    });
    return standings.sort((a, b) => b.wins - a.wins);
};

const checkTournamentCompletion = (state: State) => {
    if (state.tournament?.style === "Round Robin" && state.tournament.maxRounds) {
        return state.rounds.length >= state.tournament.maxRounds;
    }
    // Single Elimination: check if only one undefeated remains
    const standings = calculateStandings(state);
    return standings.filter((s) => s.losses === 0).length <= 1;
};

const TournamentSetup: React.FC = () => {
    const { dispatch } = React.useContext(TournamentContext);
    const { register, handleSubmit, watch } = useForm<TournamentForm>({
        resolver: zodResolver(TournamentSchema),
    });
    const style = watch("style");

    return (
        <div className="max-w-2xl mx-auto max-w-[70vw] min-w-[585px] rounded-lg shadow-xl p-6 bg-[#b4cded] border-1 border-[#041f1e]">
            <form
                onSubmit={handleSubmit((data) =>
                    dispatch({ type: "SET_TOURNAMENT", payload: data })
                )}
                className="mx-auto"
            >
                <h2 className="text-2xl font-bold mb-4 text-[#041f1e]">
                    Create Tournament
                </h2>
                <div className="space-y-3">
                    <input
                        {...register("name")}
                        placeholder="Tournament Name"
                        className="w-full p-2 bg-white rounded font-bold text-[#041f1e] border border-[#041f1e]"
                    />
                    <select
                        {...register("type")}
                        className="w-full p-2 bg-[#e6c79c] font-bold text-[#482728] rounded border border-[#041f1e]"
                    >
                        <option value="Individual">Individual</option>
                        <option value="Team">Team</option>
                    </select>
                    <select
                        {...register("style")}
                        className="w-full p-2 bg-[#e6c79c] font-bold text-[#482728] rounded border border-[#041f1e]"
                    >
                        <option value="Single Elimination">Single Elimination</option>
                        <option value="Round Robin">Round Robin</option>
                    </select>
                    {style === "Round Robin" && (
                        <input
                            type="number"
                            {...register("maxRounds", { valueAsNumber: true })}
                            placeholder="Max Rounds"
                            min="1"
                            className="w-full p-2 bg-white rounded border border-[#041f1e]"
                        />
                    )}
                    <button
                        type="submit"
                        className="w-full mt-2 p-2 bg-[#041f1e] text-white rounded active:bg-[#f25757]"
                    >
                        Next: Add Players/Teams
                    </button>
                </div>
            </form>
        </div>
    );
};

const PlayerSetup: React.FC = () => {
    const { state, dispatch } = React.useContext(TournamentContext);
    const [name, setName] = React.useState("");
    const [teamName, setTeamName] = React.useState("");
    const [selectedTeamId, setSelectedTeamId] = React.useState<
        string | undefined
    >(undefined);

    const addPlayer = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            dispatch({
                type: "ADD_PLAYER",
                payload: {
                    id: getNewId("player"),
                    name,
                    teamId: selectedTeamId,
                    wins: 0,
                    losses: 0,
                },
            });
            setName("");
        }
    };

    const addTeam = (e: React.FormEvent) => {
        e.preventDefault();
        if (teamName.trim()) {
            dispatch({
                type: "ADD_TEAM",
                payload: {
                    id: getNewId("team"),
                    name: teamName,
                    wins: 0,
                    losses: 0,
                    playerIds: [],
                },
            });
            setTeamName("");
        }
    };

    const removePlayer = (id: string) => {
        dispatch({
            type: "REMOVE_PLAYER",
            payload: { id },
        });
    };

    const removeTeam = (id: string) => {
        dispatch({
            type: "REMOVE_TEAM",
            payload: { id },
        });
    };

    const assignToTeam = (playerId: string, teamId: string | undefined) => {
        const player = state.players.find((p) => p.id === playerId);
        if (player) {
            dispatch({
                type: "UPDATE_PLAYER",
                payload: { ...player, teamId },
            });
        }
    };

    return (
        <div className="max-w-2xl mx-auto max-w-[70vw] min-w-[585px]  rounded-lg shadow-xl p-6 bg-[#b4cded] border-1 border-[#041f1e]">
            <div className="justify-between items-center mb-6">
                <h2 className="text-2xl font-bold mb-4 text-[#041f1e]">
                    Add Contestants
                </h2>
            </div>
            <div className="mx-auto grid grid-cols-2">
                <div
                    className={`bg-[#e6c79c] p-4 rounded shadow-lg border-1 gap-4 ${state.tournament?.type === "Team" ? "col-span-1" : "col-span-full"
                        }`}
                >
                    <h3 className="text-[#041f1e] font-bold"> Enter players </h3>
                    <form onSubmit={addPlayer}>
                        <div>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={`Enter a player name`}
                                className="p-2 w-[80%] bg-white rounded border border-[#041f1e] shadow-lg"
                            />
                            <button
                                type="submit"
                                className="p-2 bg-[#041f1e] text-white rounded  active:bg-[#f25757]"
                            >
                                Add
                            </button>
                        </div>
                    </form>
                    <div className="overflow-y-auto custom-scrollbar bg-[#e6c79c] mt-2 rounded  border-[#041f1e]">
                        {state.players.map((p) => (
                            <div
                                key={p.id}
                                className="p-2 h-[50px] border bg-[#482728] flex justify-between items-center rounded"
                            >
                                <span className="ml-2 text-[#b4cded] font-bold overflow-x-hidden max-w-[40%]">
                                    {p.name}
                                </span>
                                <div className="flex items-center space-x-2">
                                    {state.tournament?.type === "Team" && (
                                        <select
                                            value={p.teamId || ""}
                                            onChange={(e) =>
                                                assignToTeam(p.id, e.target.value || undefined)
                                            }
                                            className="text-[#b4cded] bg-[#041f1e] text-sm px-2 py-1 border border-[#041f1e] w-[100px] rounded focus:outline-none focus:ring-1 focus:ring-vibrant"
                                        >
                                            <option value="">No Team</option>
                                            {state.teams.map((team) => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <button
                                        onClick={() => removePlayer(p.id)}
                                        className="text-[#f25757] font-bold hover:text-lg hover:cursor-pointer hover:text-opacity-80 "
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {state.tournament?.type === "Team" && (
                    <div className="bg-[#e6c79c] p-4 rounded shadow-lg border-1 gap-4 col-span-1">
                        <h3 className="text-[#041f1e] font-bold"> Enter teams</h3>
                        <form onSubmit={addTeam}>
                            <div>
                                <input
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder={`Enter a team name`}
                                    className="p-2 w-[80%] bg-white rounded border border-[#041f1e] shadow-lg"
                                />
                                <button
                                    type="submit"
                                    className="p-2 bg-[#041f1e] text-white rounded active:bg-[#f25757]"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                        <div className="overflow-y-auto custom-scrollbar bg-[#e6c79c] mt-2 rounded  border-[#041f1e]">
                            {state.teams.map((t) => (
                                <div
                                    key={t.id}
                                    className="grid grid-cols-7 grid-rows-3 max-h-[50px] border-1 overflow-x-hidden border-[#041f1e] bg-[#482728] rounded text-[#b4cded]"
                                >
                                    <div className="overflow-x-hidden text-center col-start-2 col-span-5 row-span-full">
                                        <span className="font-bold">{t.name}</span>
                                        <br />
                                        <span className="text-sm">
                                            {t.playerIds.length} Team Member(s)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeTeam(t.id)}
                                        className="row-span-3 col-start-7 text-[#f25757] font-bold hover:text-lg hover:text-opacity-80 hover:cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-8 flex justify-between">
                <button
                    onClick={() => dispatch({ type: "SETUP" })}
                    className="bg-[#482728] text-[#e6c79c] py-2 px-6 rounded active:text-[#482728] active:bg-[#e6c79c]"
                >
                    Back
                </button>
                <button
                    onClick={() => dispatch({ type: "START_TOURNAMENT" })}
                    disabled={
                        state.tournament?.type === "Individual"
                            ? state.players.length < 2
                            : state.teams.length < 2 ||
                            state.teams.some((t) => t.playerIds.length === 0)
                    }
                    className="bg-[#482728] text-[#e6c79c] py-2 px-6 rounded active:bg-[#e6c79c] active:text-[#482728] disabled:bg-[#505050]"
                >
                    Start
                </button>
            </div>
        </div>
    );
};

const MatchCard: React.FC<{ match: Match; roundId: string }> = ({
    match,
    roundId,
}) => {
    const { state, dispatch } = React.useContext(TournamentContext);
    const [contestant1Score, setContestant1Score] = React.useState(
        match.contestant1Score || ""
    );
    const [contestant2Score, setContestant2Score] = React.useState(
        match.contestant2Score || ""
    );
    const [notes, setNotes] = React.useState(match.notes || "");

    const updateMatch = (wId: string | undefined) => {
        dispatch({
            type: "UPDATE_MATCH",
            payload: {
                roundId,
                match: { ...match, winnerId: wId, notes },
            },
        });
    };

    const roundType = state.tournament?.type;
    const contestant1Name =
        match.contestant1Id === "BYE"
            ? match.contestant1Id
            : getEntityName(state, match.contestant1Id, roundType);
    const contestant2Name =
        match.contestant2Id === "BYE"
            ? match.contestant2Id
            : getEntityName(state, match.contestant2Id, roundType);
    const radioName = "winRadio-" + match.id;
    return (
        <div className="p-4 bg-[#e6c79c] rounded-lg shadow-lg border border-[#041f1e] space-y-2">
            <div className="grid grid-cols-3 justify-between font-bold text-center align-middle text-xl text-[#041f1e]">
                <span>{contestant1Name}</span>
                <span className="text-sm">vs</span>
                <span className="font-bold">{contestant2Name}</span>
            </div>
            <div className="flex justify-between text-[#b4cded]">
                <input
                    value={contestant1Score}
                    onChange={(e) => setContestant1Score(e.target.value)}
                    placeholder="Score"
                    className="w-full p-2 bg-white rounded border border-[#041f1e] text-[#041f1e] placeholder-[#b4cded]"
                />
                <span className="w-[100%]" />
                <input
                    value={contestant2Score}
                    onChange={(e) => setContestant2Score(e.target.value)}
                    placeholder="Score"
                    className="w-full p-2 bg-white rounded border border-[#041f1e] text-[#041f1e] placeholder-[#b4cded]"
                />
            </div>
            <div className="flex justify-between gap-2 font-bold">
                <span>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value={match.contestant1Id}
                            checked={match.winnerId === match.contestant1Id}
                            onChange={() => { }}
                            onClick={() => {
                                updateMatch(match.contestant1Id);
                            }}
                            name={radioName}
                            disabled={match.contestant1Id === "BYE"}
                            className="mr-2 accent-[#f25757] disabled:opacity-50"
                        />
                        {contestant1Name} WIN
                    </label>
                </span>
                <label className="flex items-center">
                    <input
                        type="radio"
                        value={match.contestant2Id}
                        checked={match.winnerId === match.contestant2Id}
                        onChange={() => { }}
                        onClick={() => {
                            updateMatch(match.contestant2Id);
                        }}
                        name={radioName}
                        disabled={match.contestant2Id === "BYE"}
                        className="mr-2 accent-[#f25757] disabled:opacity-50"
                    />
                    {contestant2Name} WIN
                </label>
            </div>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className="w-full text-[#e6c79c] p-2 bg-[#482728] opacity-90 rounded border border-[#482728] h-[80px] resize-none"
            />
        </div>
    );
};

const TournamentRunning: React.FC = () => {
    const { state, dispatch } = React.useContext(TournamentContext);
    const currentRound = state.rounds[state.rounds.length - 1];
    const canAdvance = currentRound.matches.every((m) => m.winnerId);

    return (
        <div className="max-w-2xl mx-auto max-w-[70vw] min-w-[585px] p-6 bg-[#b4cded] rounded-lg shadow-xl border-1 border-[#041f1e]">
            <h2 className="text-2xl font-bold text-[#041f1e] mb-2">
                Round {state.rounds.length}
            </h2>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentRound.matches.map((m) => (
                    <MatchCard key={m.id} match={m} roundId={currentRound.id} />
                ))}
            </div>
            <button
                onClick={() => {
                    dispatch({ type: "COMPLETE_ROUND" });
                }}
                disabled={!canAdvance}
                className="w-full mx-auto mt-5 p-2 bg-[#041f1e] text-white rounded active:bg-[#f25757] border-1 border-[#041f1e] text-white rounded disabled:opacity-[50%] disabled:bg-[#808080]"
            >
                {canAdvance ? "Advance to Next Round" : "Complete All Matches"}
            </button>
            {state.rounds.length > 1 && (
                <div className="transbox mt-10">
                    <h1 className="text-2xl font-bold text-[#041f1e] mb-4">
                        Previous Rounds
                    </h1>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar pt-3 pb-3 rounded-md border bg-[#e6c79c]">
                        {state.rounds.slice(0, -1).map((r, i) => (
                            <div key={r.id} className="mb-4">
                                <h4 className="text-xl font-bold pl-5">Round {i + 1}</h4>
                                <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 m-2 text-center align-middle border-b-2">
                                    {r.matches.map((m) => (
                                        <div key={m.id} className="pb-3 transbox rounded m-3">
                                            {getEntityName(
                                                state,
                                                m.contestant1Id,
                                                state.tournament?.type
                                            )}{" "}
                                            vs{" "}
                                            {getEntityName(
                                                state,
                                                m.contestant2Id,
                                                state.tournament?.type
                                            )}
                                            <br />
                                            Winner:{" "}
                                            {getEntityName(
                                                state,
                                                m.winnerId || "",
                                                state.tournament?.type
                                            )}
                                            {m.contestant1Score && (
                                                <div>Score: {m.contestant1Score}</div>
                                            )}
                                            {m.notes && <div>Notes: {m.notes}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TournamentResults: React.FC = () => {
    const { state, dispatch } = React.useContext(TournamentContext);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="max-w-2xl mx-auto max-w-[70vw] min-w-[585px] rounded-lg shadow-xl p-6 bg-[#482728] border border-[#041f1e] text-[#e6c79c]">
                <div className="flex justify-between">
                    <h1 className="text-2xl mb-4 font-bold">Final Standings</h1>
                    <button
                        onClick={() => {
                            dispatch({ type: "SETUP" });
                        }}
                        className="max-h-[40px] min-w-[175px] bg-[#f25757] text-white p-2 rounded hover:bg-[#d94a4a]"
                    >
                        Start New Tournament
                    </button>
                </div>
                <div className="bg-[#b4cded] mt-2 text-[#041f1e] border-[#482728] border-3 rounded-xl font-bold ">
                    {state.standings.map((s, i) => (
                        <div
                            key={s.id}
                            className="grid grid-cols-6 pl-2  transbox border-[#482728] border-b-2"
                        >
                            <span className="col-span-1">{i + 1}.</span>
                            <span className="col-span-3 text-center overflow-x-hidden whitespace-nowrap ">
                                {getEntityName(state, s.id, state.tournament?.type)}
                            </span>
                            <span className="col-span-2 text-right mr-2 overflow-x-hidden">
                                W: {s.wins} L: {s.losses}
                            </span>
                        </div>
                    ))}
                </div>
                <div>
                    <details className="mt-4 mb-2">
                        <summary className="font-bold text-[#e6c79c] cursor-pointer mb-4">
                            Round History
                        </summary>
                        <div className="max-h-80 overflow-y-auto border-[#482728] border-2 rounded-lg bg-[#b4cded] custom-scrollbar-2">
                            {state.rounds.map((round, idx) => (
                                <div
                                    key={idx}
                                    className="mt-3 bg-[#b4cded] border-[#482728] border-b-3 text-[#041f1e]"
                                >
                                    <h3 className="text-xl font-bold pl-2 pt-1">
                                        Round {idx + 1}
                                    </h3>
                                    <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 m-2 text-center align-middle">
                                        {round.matches.map((m, pIdx) => (
                                            <div key={pIdx} className="pt-2 pb-3">
                                                {getEntityName(
                                                    state,
                                                    m.contestant1Id,
                                                    state.tournament?.type
                                                )}{" "}
                                                vs{" "}
                                                {getEntityName(
                                                    state,
                                                    m.contestant2Id,
                                                    state.tournament?.type
                                                )}{" "}
                                                - Winner:{" "}
                                                {m.winnerId === m.contestant1Id
                                                    ? getEntityName(
                                                        state,
                                                        m.contestant1Id,
                                                        state.tournament?.type
                                                    )
                                                    : getEntityName(
                                                        state,
                                                        m.contestant2Id,
                                                        state.tournament?.type
                                                    )}
                                                <p>
                                                    Scores: {m.contestant1Score} - {m.contestant2Score}
                                                </p>
                                                <p>Notes: {m.notes || "None"}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = useMemo(() => ({ state, dispatch }), [state]);

    return (
        <TournamentContext.Provider value={value}>
            <div className="min-h-screen bg-[#e6c79c] text-[#041f1e]">
                <header className="bg-[#482728] text-[#e6c79c] p-4 shadow-md">
                    <h1 className="text-2xl font-bold ">
                        {state.tournament?.name || "Tournament Manager"}
                        {state.phase !== "setup" &&
                            " - " + state.tournament?.type + " • " + state.tournament?.style}
                        {state.phase === "running" && ": Round " + state.rounds.length}
                    </h1>
                </header>
                <main className="container mx-auto p-4">
                    {state.phase === "setup" && <TournamentSetup />}
                    {state.phase === "contestants" && <PlayerSetup />}
                    {state.phase === "running" && <TournamentRunning />}
                    {state.phase === "completed" && <TournamentResults />}
                </main>
            </div>
        </TournamentContext.Provider>
    );
};

export default App;
