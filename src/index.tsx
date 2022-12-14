import React, {
	useState, useRef, useContext, useLayoutEffect, useMemo,
	Fragment, createContext,
	ReactNode, ComponentType
} from 'react';
import isEqual from 'react-fast-compare';

export type ModProps<Props> = Omit<Props, 'structure'> & {
	structure: Structure;
};

export interface Modifiable {
	structure: never;
}

type Structure = (base: ReactNode) => ReactNode;

type PropSetter<Props> = (props: ModProps<Props>) => void;

export function Mod<Props>(props: ModProps<Props>) {
	const backwardProps = useContext(Context) as PropSetter<Props>;
	const prevProps = useRef<ModProps<Props> | undefined>();

	useLayoutEffect(() => {
		if (!isEqual(props, prevProps.current)) {
			prevProps.current = props;
			backwardProps(props);
		}
	}, [props, backwardProps]);
	return null;
}

export function withMods<Props extends Modifiable>(
	Base: ComponentType<Props>,
	...modChain: ComponentType<ModProps<Props>>[]
) {
	return function ModManager(props: Props) {
		const [modProps, setModProps] = useState<ModProps<Props>[]>([]);
		const propSetters: PropSetter<Props>[] = useMemo(() =>
			modChain.map((_, index) => value => setModProps(props => {
				props[index] = value;
				return [...props];
			}))
		, []);

		const allProps = [{...props, structure: emptyStructure}, ...modProps];
		const {structure, ...resultProps} = allProps[modChain.length] || {};

		return (<>
			{structure && <Fragment key="base">
				{structure(<Base {...resultProps as Props} />)}
			</Fragment>}
			{modChain.map((Mod, index) => index in allProps && (
				<Context.Provider
					key={index}
					value={propSetters[index] as PropSetter<unknown>}
				>
					<Mod {...allProps[index]} />
				</Context.Provider>
			))}
		</>);
	};
}

const Context = createContext<PropSetter<unknown>>(() => {});
Context.displayName = 'ModContext';

const emptyStructure: Structure = element => element;